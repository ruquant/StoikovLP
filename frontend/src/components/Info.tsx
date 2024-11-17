import React from "react";
import { Box, Card, CardContent, CardHeader, Tab, Tabs } from "@mui/material";
import { OpenOrders } from "./OpenOrders";
import { OrderHistory } from "./OrderHistory";
import { TradeHistory } from "./TradeHistory";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`
  };
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const Info = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Card sx={{ backgroundColor: "rgba(255, 255, 242, 0.03)" }}>
      <CardHeader title="Info" />
      <CardContent>
        <Box sx={{ width: "100%" }}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={value} onChange={handleChange}>
              <Tab label="Open Orders" {...a11yProps(0)} />
              <Tab label="Trade History" {...a11yProps(1)} />
              <Tab label="Order History" {...a11yProps(2)} />
            </Tabs>
          </Box>
          <CustomTabPanel value={value} index={0}>
            <OpenOrders />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={1}>
            <TradeHistory />
          </CustomTabPanel>
          <CustomTabPanel value={value} index={2}>
            <OrderHistory />
          </CustomTabPanel>
        </Box>
      </CardContent>
    </Card>
  );
};
