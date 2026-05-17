import React from "react";
import { FormControlLabel, Radio, RadioGroup as MuiRadioGroup } from "@mui/material";
import styles from "components/reports/DataQueryForm.module.css";

function RadioGroup({ currentValue, handleChange }) {
  return (
      <>
        <div className={styles["radio-container"]}>
          <MuiRadioGroup
              aria-labelledby="demo-controlled-radio-buttons-group"
              name="controlled-radio-buttons-group"
              value={currentValue}
              onChange={handleChange}
          >
            <div className={styles["radio-button"]}>
              <FormControlLabel
                  control={<Radio />}
                  label="Yes"
                  id="true"
                  value={true}
              />
            </div>

            <div className={styles["radio-button"]}>
              <FormControlLabel
                  control={<Radio />}
                  label="No"
                  id="false"
                  value={false}
              />
            </div>
          </MuiRadioGroup>
        </div>
      </>
  );
}

export default RadioGroup;
