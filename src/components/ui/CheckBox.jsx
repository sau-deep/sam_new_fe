import { Checkbox, FormControlLabel } from "@mui/material";
import React from "react";

function CheckBox({
  option1,
  option2,
  label1,
  label2,
  checkedValue,
  onCheckBoxChange,
}) {
  return (
    <>
      <FormControlLabel
        control={
          <Checkbox
            required
            checked={checkedValue === option1}
            onChange={onCheckBoxChange}
            value={option1}
          />
        }
        label={label1}
      />
      <FormControlLabel
        control={
          <Checkbox
            required
            checked={checkedValue === option2}
            onChange={onCheckBoxChange}
            value={option2}
          />
        }
        label={label2}
      />
    </>
  );
}

export default CheckBox;
