import React from "react";
import { FormControlLabel, Radio } from "@mui/material";
import styles from "components/reports/DataQueryForm.module.css";

function ThreeRadioButton({ currentValue, handleChange }) {
  return (
    <>
      <div className={styles["radio-container"]}>
        <div className={styles["radio-button"]}>
          <FormControlLabel
            value="training_conducted"
            control={<Radio />}
            label="Training Conducted"
            name="training_conducted"
            id="training_conducted"
            checked={currentValue === "training_conducted"}
            onChange={handleChange}
          />
        </div>

        <div className={styles["radio-button"]}>
          <FormControlLabel
            control={<Radio />}
            label="No Training Held"
            type="radio"
            name="no_training_conducted"
            id="no_training_conducted"
            value="no_training_conducted"
            checked={currentValue === "no_training_conducted"}
            onChange={handleChange}
          />
        </div>

        <div className={styles["radio-button"]}>
          <FormControlLabel
            control={<Radio />}
            label="NA"
            type="radio"
            name="na"
            id="na"
            value="na"
            checked={currentValue === "na"}
            onChange={handleChange}
          />
        </div>
      </div>
    </>
  );
}

export default ThreeRadioButton;
