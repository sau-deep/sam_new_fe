import { Backdrop, CircularProgress } from "@mui/material";
import React from "react";

function CustomBackdrop({ open }) {
  return (
    <Backdrop
      sx={{
        color: "#fff",
        backgroundColor: "#000000CC",
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
      open={open}>
      <CircularProgress color="inherit" sx={{ marginRight: 2 }} />
      Loading...
    </Backdrop>
  );
}

export default CustomBackdrop;
