import React from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

function Loader(props) {
  const { loading } = props;

  return loading === true ? (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 5,
      }}>
      <CircularProgress sx={{ color: "#105bab" }} />
      <div style={{ padding: 5, fontWeight: 600 }}>Please wait...</div>
    </Box>
  ) : null;
}

export default Loader;
