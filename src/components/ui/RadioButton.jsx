import React from "react";
import { FormControlLabel, Radio } from "@mui/material";
import styles from "components/reports/DataQueryForm.module.css";

function RadioButton({ normalized, onNormalizedChange }) {
  return (
    <>
      <div className={styles["radio-container"]}>
        <div className={styles["radio-button"]}>
          <FormControlLabel
            value="TRUE"
            control={<Radio />}
            label="Yes"
            name="normalized"
            id="true"
            checked={normalized === true}
            onChange={onNormalizedChange}
          />
        </div>

        <div className={styles["radio-button"]}>
          <FormControlLabel
            control={<Radio />}
            label="No"
            type="radio"
            name="normalized"
            id="false"
            value="FALSE"
            checked={normalized === false}
            onChange={onNormalizedChange}
          />
        </div>
      </div>
    </>
  );
}

export default RadioButton;
