// SPDX-License-Identifier: BUSL-1.1
// Hanji Protocol. On-chain limit order book exchange
// (c) Long Gamma Labs, 2023.
pragma solidity ^0.8.0;

import { IERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import { ERC20Upgradeable } from "../lib/openzeppelin-contracts-upgradeable/contracts/token/ERC20/ERC20Upgradeable.sol";
import { ERC20PermitUpgradeable } from "../lib/openzeppelin-contracts-upgradeable/contracts/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import { Ownable2StepUpgradeable } from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import { PausableUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import { Math } from "../lib/openzeppelin-contracts/contracts/utils/math/Math.sol";
import { SafeERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Import Pyth Interfaces
import { IPyth } from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import { PythStructs } from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

import { HanjiErrors } from "./HanjiErrors.sol";
import { HanjiHelper } from "./HanjiHelper.sol";
import { HanjiLOB, Trader } from "./HanjiLOB.sol";
import { HanjiFP24 } from "./HanjiFP24.sol";
import { Uint256Array, Uint256Stack } from "./Uint256Stack.sol";

contract HanjiVault is UUPSUpgradeable, ERC20Upgradeable, ERC20PermitUpgradeable, Ownable2StepUpgradeable, ReentrancyGuardUpgradeable, PausableUpgradeable {
    using Uint256Stack for Uint256Array;

    event Deposit(
        address indexed from,
        uint128 amountTokenX,
        uint128 amountTokenY,
        uint256 amountLpToken
    );
    event Withdraw(
        address indexed to,
        uint128 amountTokenX,
        uint128 amountTokenY,
        uint256 amountLpToken
    );
    event MarketMakerChanged(
        address newMarketMaker,
        address oldMarketMaker
    );
    event LiquidityInitializerChanged(
        address newLiquidityInitializer,
        address oldLiquidityInitializer
    );
    event PauserChanged(
        address newPauser,
        address oldPauser
    );

    struct Reserves {
        uint128 depositedTokenX;
        uint128 depositedTokenY;
        uint128 ordersAmountTokenX;
        uint128 ordersAmountTokenY;
    }

    struct Order {
        uint64 orderId;
        uint72 price;
        uint128 leaveQty;
    }

    IERC20 public tokenX;
    IERC20 public tokenY;
    uint256 scalingFactorTokenX;
    uint256 scalingFactorTokenY;
    HanjiLOB lob;
    HanjiHelper helper;
    address marketMaker;
    address liquidityInitializer;
    address pauser;
    uint256 penalty;

    Uint256Array public bidsIds;
    Uint256Array public asksIds;

    IPyth public pyth;
    bytes32 public ethPriceFeedId;
    uint64 public currentBidOrderId;
    uint64 public currentAskOrderId;

    modifier onlyMarketMaker() {
        if (msg.sender != marketMaker)
            revert HanjiErrors.Forbidden();
        _;
    }

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address lob_,
        address helper_,
        string memory name_,
        string memory symbol_,
        address administrator_,
        address marketMaker_,
        address liquidityInitializer_,
        address pauser_,
        uint256 penalty_,
        address pythAddress_,
        bytes32 ethPriceFeedId_
    ) public initializer {
        __UUPSUpgradeable_init();
        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __Ownable_init(administrator_);
        __Ownable2Step_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        lob = HanjiLOB(payable(lob_));
        lob.setClaimableStatus(false);

        helper = HanjiHelper(helper_);

        marketMaker = marketMaker_;
        liquidityInitializer = liquidityInitializer_;
        pauser = pauser_;
        penalty = penalty_;

        pyth = IPyth(pythAddress_);
        ethPriceFeedId = ethPriceFeedId_;

        address tokenXAddress;
        address tokenYAddress;
        (scalingFactorTokenX, scalingFactorTokenY, tokenXAddress, tokenYAddress,,,,,,,,,) = lob.getConfig();

        tokenX = IERC20(tokenXAddress);
        tokenY = IERC20(tokenYAddress);

        bidsIds.setRealSize(0);
        asksIds.setRealSize(0);

        currentBidOrderId = 0;
        currentAskOrderId = 0;
    }

    function getConfig() public view returns (
        address administrator_,
        address marketMaker_,
        address liquidityInitializer_,
        address pauser_,
        uint256 penalty_
    ) {
        return (
            owner(),
            marketMaker,
            liquidityInitializer,
            pauser,
            penalty
        );
    }

    function allocOrderStorage(uint256 count) external {
        for (uint256 i = 0; i < count; ++i) {
            bidsIds.alloc();
            asksIds.alloc();
        }
    }

    function changeMarketMaker(address marketMaker_) external onlyOwner {
        if (marketMaker == marketMaker_) {
            return;
        }

        emit MarketMakerChanged(marketMaker_, marketMaker);
        marketMaker = marketMaker_;
    }

    function changeLiquidityInitializer(address liquidityInitializer_) external onlyOwner {
        if (liquidityInitializer == liquidityInitializer_) {
            return;
        }

        emit LiquidityInitializerChanged(liquidityInitializer_, liquidityInitializer);
        liquidityInitializer = liquidityInitializer_;
    }

    function deposit(
        uint128 amountTokenX,
        uint128 amountTokenY,
        uint256 minAmountLpToken
    ) external nonReentrant whenNotPaused {
        if (amountTokenX == 0 && amountTokenY == 0) {
            revert HanjiErrors.ZeroTokenTransferNotAllowed();
        }

        uint256 amountLpToken;
        uint256 supplyLpToken = this.totalSupply();

        if (supplyLpToken == 0) {
            if (msg.sender != liquidityInitializer) { // only liquidity initializer can do first deposit
                revert HanjiErrors.OnlyLiquidityInitializerCanDepositFirstTime();
            }

            amountLpToken = Math.max(amountTokenX, amountTokenY);
        } else {
            (Reserves memory reserves,,) = _updateReservesAndOrders();

            uint256 totalTokenX = reserves.depositedTokenX + reserves.ordersAmountTokenX;
            uint256 totalTokenY = reserves.depositedTokenY + reserves.ordersAmountTokenY;

            if (amountTokenY == 0) {
                if (totalTokenX == 0) { // Can't calculate token y amount if total token x amount is zero
                    revert HanjiErrors.ZeroTokenBalanceIsNotAllowed();
                }

                amountTokenY = _divWithCeilingCastToUint128(amountTokenX * totalTokenY, totalTokenX);
            } else {
                if (totalTokenY == 0) { // Can't calculate token x amount if total token y amount is zero
                    revert HanjiErrors.ZeroTokenBalanceIsNotAllowed();
                }

                amountTokenX = _divWithCeilingCastToUint128(amountTokenY * totalTokenX, totalTokenY);
            }

            if (totalTokenX > totalTokenY) {
                amountLpToken = (amountTokenX * supplyLpToken) / totalTokenX;
            } else {
                amountLpToken = (amountTokenY * supplyLpToken) / totalTokenY;
            }
        }

        if (amountLpToken < minAmountLpToken) {
            revert HanjiErrors.InsufficientAmountLpToken();
        }

        _mint(msg.sender, amountLpToken);

        uint256 actualAmountTokenX = _convertToActualTokenXAmount(amountTokenX);
        uint256 actualAmountTokenY = _convertToActualTokenYAmount(amountTokenY);

        if (amountTokenX > 0) {
            SafeERC20.safeTransferFrom(
                tokenX,
                msg.sender,
                address(this),
                actualAmountTokenX
            );

            tokenX.approve(address(lob), actualAmountTokenX);
        }

        if (amountTokenY > 0) {
            SafeERC20.safeTransferFrom(
                tokenY,
                msg.sender,
                address(this),
                actualAmountTokenY
            );

            tokenY.approve(address(lob), actualAmountTokenY);
        }

        lob.depositTokens(amountTokenX, amountTokenY);
        emit Deposit(msg.sender, amountTokenX, amountTokenY, amountLpToken);
    }

    function withdraw(
        uint256 amountLpToken,
        uint128 minAmountTokenX,
        uint128 minAmountTokenY,
        uint128 maxCommissionPerOrder,
        uint256 expired
    ) external nonReentrant whenNotPaused {
        if (amountLpToken == 0) {
            revert HanjiErrors.ZeroTokenTransferNotAllowed();
        }

        uint256 supplyLpToken = this.totalSupply();
        if (supplyLpToken == 0) {
            revert HanjiErrors.WithdrawWithZeroSupplyIsNotPossible();
        }

        (
            Reserves memory reserves,
            Order[] memory asks,
            Order[] memory bids
        ) = _updateReservesAndOrders();

        uint256 totalTokenX = reserves.depositedTokenX + reserves.ordersAmountTokenX;
        uint256 totalTokenY = reserves.depositedTokenY + reserves.ordersAmountTokenY;

        uint128 penaltyAmountX = 0;
        uint128 penaltyAmountY = 0;
        uint128 amountTokenX = _divWithCastToUint128(amountLpToken * totalTokenX, supplyLpToken);
        uint128 amountTokenY = _divWithCastToUint128(amountLpToken * totalTokenY, supplyLpToken);

        _burn(msg.sender, amountLpToken); // hint: LP token balance also checked here

        if (reserves.depositedTokenX < amountTokenX) { // is not enough x
            uint128 withdrawalAmountX = amountTokenX - reserves.depositedTokenX;

            _releaseFundsForWithdrawal(
                asksIds,
                asks,
                withdrawalAmountX,
                reserves.ordersAmountTokenX,
                maxCommissionPerOrder,
                expired
            );

            penaltyAmountX = _divWithCeilingCastToUint128(reserves.ordersAmountTokenX * penalty, 100000);

            if (amountTokenX <= penaltyAmountX) {
                revert HanjiErrors.InsufficientTokenX();
            }

            amountTokenX -= penaltyAmountX;
        }

        if (reserves.depositedTokenY < amountTokenY) { // is not enough y
            uint128 withdrawalAmountY = amountTokenY - reserves.depositedTokenY;

            _releaseFundsForWithdrawal(
                bidsIds,
                bids,
                withdrawalAmountY,
                reserves.ordersAmountTokenY,
                maxCommissionPerOrder,
                expired
            );

            penaltyAmountY = _divWithCeilingCastToUint128(reserves.ordersAmountTokenY * penalty, 100000);

            if (amountTokenY <= penaltyAmountY) {
                revert HanjiErrors.InsufficientTokenY();
            }

            amountTokenY -= penaltyAmountY;
        }

        lob.withdrawTokens(false, amountTokenX, amountTokenY);

        if (amountTokenX < minAmountTokenX) {
            revert HanjiErrors.InsufficientTokenX();
        }

        if (amountTokenY < minAmountTokenY) {
            revert HanjiErrors.InsufficientTokenY();
        }

        uint256 actualAmountTokenX = _convertToActualTokenXAmount(amountTokenX);
        uint256 actualAmountTokenY = _convertToActualTokenYAmount(amountTokenY);

        if (amountTokenX > 0) {
            SafeERC20.safeTransfer(
                tokenX,
                msg.sender,
                actualAmountTokenX
            );
        }

        if (amountTokenY > 0) {
            SafeERC20.safeTransfer(
                tokenY,
                msg.sender,
                actualAmountTokenY
            );
        }

        emit Withdraw(msg.sender, amountTokenX, amountTokenY, amountLpToken);
    }

    function placeOrder(
        bool isAsk,
        uint128 quantity,
        uint72 price,
        uint128 maxCommission,
        bool marketOnly,
        bool postOnly,
        uint256 expired
    )
        external
        onlyMarketMaker
        nonReentrant
        whenNotPaused
        returns (uint64 orderId)
    {
        (orderId,,,) = lob.placeOrder(
            isAsk,
            quantity,
            price,
            maxCommission,
            marketOnly,
            postOnly,
            false,
            expired
        );

        if (orderId > 0) {
            _saveOrderToLocalStorage(isAsk, orderId);
        }

        return orderId;
    }

    function claimOrder(uint64 orderId, uint256 expired)
        external
        onlyMarketMaker
        nonReentrant
        whenNotPaused
    {
        _claimOrder(orderId, expired);
    }

    function batchClaimOrder(uint64[] memory orderIds, uint256 expired)
        external
        onlyMarketMaker
        nonReentrant
        whenNotPaused
    {
        for (uint i = 0; i < orderIds.length; ++i) {
            _claimOrder(orderIds[i], expired);
        }
    }

    function changeOrder(
        uint64 oldOrderId,
        uint128 newQuantity,
        uint72 newPrice,
        uint128 maxCommission,
        bool postOnly,
        uint256 expired
    )
        external
        onlyMarketMaker
        nonReentrant
        whenNotPaused
        returns (uint64 orderId)
    {
        bool isAsk = _isAsk(oldOrderId);

        orderId = lob.changeOrder(
            oldOrderId,
            newQuantity,
            newPrice,
            maxCommission,
            postOnly,
            false,
            expired
        );

        if (orderId > 0) {
            _saveOrderToLocalStorage(isAsk, orderId);
        }

        if (oldOrderId > 1) {
            if (isAsk) {
                _tryRemoveOrderFromLocalStorage(asksIds, oldOrderId);
            } else {
                _tryRemoveOrderFromLocalStorage(bidsIds, oldOrderId);
            }
        }

        return orderId;
    }

    function batchChangeOrder(
        uint64[] memory orderIds,
        uint128[] memory quantities,
        uint72[] memory prices,
        uint128 maxCommissionPerOrder,
        bool postOnly,
        uint256 expired
    )
        external
        onlyMarketMaker
        nonReentrant
        whenNotPaused
        returns (uint64[] memory newOrderIds)
    {
        newOrderIds = lob.batchChangeOrder(
            orderIds,
            quantities,
            prices,
            maxCommissionPerOrder,
            postOnly,
            false,
            expired
        );

        for (uint i = 0; i < newOrderIds.length; ++i) {
            bool isAsk = _isAsk(newOrderIds[i]);

            if (newOrderIds[i] > 0) {
                _saveOrderToLocalStorage(isAsk, newOrderIds[i]);
            }

            if (orderIds[i] > 1) {
                if (isAsk) {
                    _tryRemoveOrderFromLocalStorage(asksIds, orderIds[i]);
                } else {
                    _tryRemoveOrderFromLocalStorage(bidsIds, orderIds[i]);
                }
            }
        }
    }

    function updateReservesAndOrders() external nonReentrant whenNotPaused returns (
        Reserves memory reserves,
        Order[] memory asks,
        Order[] memory bids
    ) {
        return _updateReservesAndOrders();
    }

    /// @notice Pause contract
    /// @dev Can be called by administrator and pauser
    function pause() external {
        require(msg.sender == owner() || msg.sender == pauser, HanjiErrors.Forbidden());
        _pause();
    }

    /// @notice Unpause contract
    /// @dev Can be called by administrator and pauser
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Change pauser by administrator
    /// @param pauser_ New pauser address
    /// @dev Can be called only by administrator
    function changePauser(address pauser_) external onlyOwner {
        if (pauser == pauser_) {
            return;
        }

        emit PauserChanged(pauser_, pauser);
        pauser = pauser_;
    }

    function _updateReservesAndOrders() internal returns (
        Reserves memory reserves,
        Order[] memory updatedAsks,
        Order[] memory updatedBids
    ) {
        (uint128 depositedTokenX, uint128 depositedTokenY,) = lob.getTraderBalance(address(this));

        uint128 ordersAmountTokenX;
        uint128 ordersAmountTokenY;

        (ordersAmountTokenX, updatedAsks) = _updateOrders(asksIds, true);
        (ordersAmountTokenY, updatedBids) = _updateOrders(bidsIds, false);

        reserves = Reserves({
            depositedTokenX: depositedTokenX,
            depositedTokenY: depositedTokenY,
            ordersAmountTokenX: ordersAmountTokenX,
            ordersAmountTokenY: ordersAmountTokenY
        });
    }

    function _claimOrder(uint64 orderId, uint256 expired) internal {
        lob.claimOrder(orderId, false, false, expired);

        if (_isAsk(orderId)) {
            _tryRemoveOrderFromLocalStorage(asksIds, orderId);
        } else {
            _tryRemoveOrderFromLocalStorage(bidsIds, orderId);
        }
    }

    function _updateOrders(
        Uint256Array storage ordersIds,
        bool isAsk
    )
        internal
        returns (uint128 ordersAmount, Order[] memory orders)
    {
        uint256 i = 0;

        uint256 orderCount = ordersIds.getRealSize();
        bool isOrderCountChanged = false;

        orders = new Order[](orderCount);

        while (i < orderCount) {
            uint64 orderId = uint64(ordersIds.data[i]);

            (
                ,
                uint72 price,
                uint128 totalShares,
                uint128 remainShares,
                uint128 payoutAmount,
                ,
            ) = helper.getOrderInfo(address(lob), orderId);

            uint128 amount = isAsk
                ? remainShares
                : remainShares * price + payoutAmount;

            if (amount == 0) { // if an order is canceled or filled, it can be removed
                if (orderCount >= 1) {
                    ordersIds.data[i] = ordersIds.data[orderCount - 1];
                }

                orderCount--;
                isOrderCountChanged = true;
            } else {
                orders[i] = Order({
                    orderId: orderId,
                    price: price,
                    leaveQty: remainShares
                });

                ordersIds.data[i] = orderId;
                ++i;
            }

            ordersAmount += amount;
        }

        if (isOrderCountChanged) {
            ordersIds.setRealSize(orderCount);
        }
    }

    function _saveOrderToLocalStorage(bool isAsk, uint64 orderId) internal {
        if (isAsk) {
            asksIds.push(orderId);
        } else {
            bidsIds.push(orderId);
        }
    }

    function _tryRemoveOrderFromLocalStorage(Uint256Array storage orders, uint64 orderId) internal {
        uint256 orderCount = orders.getRealSize();
        bool isOrderCountChanged = false;

        for (uint256 i = 0; i < orderCount; ++i) {
            if (uint64(orders.data[i]) == orderId) {
                if (orderCount >= 1) {
                    orders.data[i] = orders.data[orderCount - 1];
                }

                orderCount--;
                break;
            }
        }

        if (isOrderCountChanged) {
            orders.setRealSize(orderCount);
        }
    }

    function _releaseFundsForWithdrawal(
        Uint256Array storage ordersIds,
        Order[] memory orders,
        uint128 withdrawalAmount,
        uint128 ordersAmount,
        uint128 maxCommissionPerOrder,
        uint256 expired
    )
        internal
    {
        uint256 orderCount = orders.length;

        while (orderCount > 0 && orders[orderCount - 1].orderId == 0) {
            orderCount--;
        }

        uint64[] memory orderIds = new uint64[](orderCount);
        uint128[] memory qtys = new uint128[](orderCount);
        uint72[] memory prices = new uint72[](orderCount);

        for (uint256 i = 0; i < orderCount; ++i) {
            orderIds[i] = orders[i].orderId;
            qtys[i] = _divWithCastToUint128(orders[i].leaveQty * (ordersAmount - withdrawalAmount), ordersAmount);
            // todo: check if qtys[i] == 0?
            prices[i] = orders[i].price;
        }

        uint64[] memory newOrderIds = lob.batchChangeOrder(
            orderIds,
            qtys,
            prices,
            maxCommissionPerOrder,
            false,
            false,
            expired
        );

        // update local orders
        for (uint256 i = 0; i < orderCount; ++i) {
            // todo: remove canceled orders from local storage?
            ordersIds.data[i] = newOrderIds[i];
        }
    }

    function _convertToActualTokenXAmount(uint128 token) internal view returns (uint256) {
        return token * scalingFactorTokenX;
    }

    function _convertToActualTokenYAmount(uint128 token) internal view returns (uint256) {
        return token * scalingFactorTokenY;
    }

    function _divWithCastToUint128(uint256 a, uint256 b) internal pure returns (uint128) {
        uint256 r = a / b;

        if (r > type(uint128).max) {
            revert HanjiErrors.Uint128Overflow();
        }

        return uint128(r);
    }

    function _divWithCeilingCastToUint128(uint256 a, uint256 b) internal pure returns (uint128) {
        uint256 r = (a + b - 1) / b;

        if (r > type(uint128).max) {
            revert HanjiErrors.Uint128Overflow();
        }

        return uint128(r);
    }

    function _isAsk(uint64 orderId) internal pure returns (bool) {
        return (orderId & uint64(0x1)) == 0x1;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function updateQuotes(bytes[] calldata priceUpdateData) external payable nonReentrant whenNotPaused {
        // Step 1: Update Pyth price feeds
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient fee for Pyth update");
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);

        // Step 2: Fetch the current ETH/USD price
        PythStructs.Price memory ethPrice = pyth.getPriceUnsafe(ethPriceFeedId);

        // Ensure the price is available and not stale
        if (ethPrice.publishTime == 0) {
            revert HanjiErrors.InvalidPrice();
        }

        // Convert ethPrice.price from int64 to uint256
        uint256 price = uint256(int256(ethPrice.price));

        // Compute actualPrice with integer arithmetic
        uint256 actualPrice = (price * 1e5) / 1e8;
        uint256 bidPrice;
        uint256 askPrice;


        askPrice = (actualPrice * 1005) / 1000;
        bidPrice = (actualPrice * 995) / 1000;
        // Ensure only the first 5 non-zero digits are kept
        uint256 digits = _numDigits(askPrice);
        if (digits > 5) {
            uint256 divisor = 10 ** (digits - 5);
            askPrice = askPrice / divisor;
        }
        digits = _numDigits(askPrice);
        require(digits < 6, "ask Digits are more than 5");

        digits = _numDigits(bidPrice);
        if (digits > 5) {
            uint256 divisor = 10 ** (digits - 5);
            bidPrice = bidPrice / divisor;
        }
        digits = _numDigits(bidPrice);
        require(digits < 6, "bid Digits are more than 5");


        // Step 3: Generate a random number (e.g., using block hash)
        // Note: Using block variables for randomness is not secure for production.
        uint256 randomNumber = 0; //uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, blockhash(block.number - 1))));

        // Step 4: Compute new bid and ask prices based on the ETH price and randomness
        uint72 newBidPrice = uint72(bidPrice); // computeBidPrice((actualPrice), randomNumber);
        uint72 newAskPrice = uint72(askPrice); // computeAskPrice((actualPrice), randomNumber);

        // Step 5: Retrieve existing orders and compare prices
        bool shouldUpdateBid = false;
        bool shouldUpdateAsk = false;

        if (currentBidOrderId != 0) {
            // Fetch existing bid order price
            (, uint72 existingBidPrice, , , , ,) = helper.getOrderInfo(address(lob), currentBidOrderId);
            if (existingBidPrice != newBidPrice) {
                shouldUpdateBid = true;
            }
        } else {
            shouldUpdateBid = true;
        }

        if (currentAskOrderId != 0) {
            // Fetch existing ask order price
            (, uint72 existingAskPrice, , , , ,) = helper.getOrderInfo(address(lob), currentAskOrderId);
            if (existingAskPrice != newAskPrice) {
                shouldUpdateAsk = true;
            }
        } else {
            shouldUpdateAsk = true;
        }

        // Step 6: Cancel old orders if necessary
        if (shouldUpdateBid && currentBidOrderId != 0) {
            // Cancel existing bid order by setting quantity to zero
            lob.changeOrder(
                currentBidOrderId,
                0,
                newBidPrice,
                type(uint128).max,
                false,
                false,
                block.timestamp + 1 hours // expire time
            );
            _tryRemoveOrderFromLocalStorage(bidsIds, currentBidOrderId);
            currentBidOrderId = 0;
        }

        if (shouldUpdateAsk && currentAskOrderId != 0) {
            // Cancel existing ask order by setting quantity to zero
            lob.changeOrder(
                currentAskOrderId,
                0,
                newAskPrice,
                type(uint128).max,
                false,
                false,
                block.timestamp + 1 hours // expire time
            );
            _tryRemoveOrderFromLocalStorage(asksIds, currentAskOrderId);
            currentAskOrderId = 0;
        }

        // Step 7: Place new orders if necessary
        if (shouldUpdateBid) {
            uint128 bidQuantity = computeBidQuantity();
            uint128 maxCommission = type(uint128).max;
            uint64 orderId;
            (orderId,,,) = lob.placeOrder(
                false, // isAsk = false for bid
                bidQuantity,
                newBidPrice,
                maxCommission,
                false,
                false,
                false,
                block.timestamp + 1 hours // expire time
            );
            currentBidOrderId = orderId;
            _saveOrderToLocalStorage(false, currentBidOrderId);
        }

        if (shouldUpdateAsk) {
            uint128 askQuantity = computeAskQuantity();
            uint128 maxCommission = type(uint128).max;
            uint64 orderId;
            (orderId,,,) = lob.placeOrder(
                true, // isAsk = true for ask
                askQuantity,
                newAskPrice,
                maxCommission,
                false,
                false,
                false,
                block.timestamp + 1 hours // expire time
            );
            currentAskOrderId = orderId;
            _saveOrderToLocalStorage(true, currentAskOrderId);
        }
    }

    // Helper function to calculate the number of digits in a uint256
    function _numDigits(uint256 number) internal pure returns (uint256) {
        uint256 digits = 0;
        while (number != 0) {
            digits++;
            number /= 10;
        }
        return digits;
    }

    // Helper functions to compute bid and ask prices and quantities
    
    function computeBidPrice(uint256 ethPrice, uint256 randomNumber) internal pure returns (uint72) {
        // Decrease the price by 1
        uint256 adjustedPrice = ethPrice;// - 1;
        return uint72(adjustedPrice);
    }

    function computeAskPrice(uint256 ethPrice, uint256 randomNumber) internal pure returns (uint72) {
        // Increase the price by 1
        uint256 adjustedPrice = ethPrice;//+ 1;
        return uint72(adjustedPrice);
    }

    function computeBidQuantity() internal view returns (uint128) {
        // Implement your logic to compute bid quantity
        // For example, use a fixed quantity or based on vault's balance
        return 100; // Example fixed quantity
    }

    function computeAskQuantity() internal view returns (uint128) {
        // Implement your logic to compute ask quantity
        // For example, use a fixed quantity or based on vault's balance
        return 1; // Example fixed quantity
    }
}
