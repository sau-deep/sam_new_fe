import { IconButton, InputAdornment, TextField } from "@mui/material";
import React from "react";
import styles from "styles/form-styles.module.css";

import KeyIcon from "@mui/icons-material/Key";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function PasswordInput({
  label,
  name,
  placeholder,
  showPassword,
  onShowPassword,
  value,
  onChange,
  ...props
}) {
  return (
    <>
      <label className={styles.label}>
        {label} <span style={{ color: "red" }}>*</span>
      </label>
      <TextField
        fullWidth
        size="small"
        required
        type={showPassword ? "text" : "password"}
        id={name}
        name={name}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <KeyIcon style={{ color: "#069edb" }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={onShowPassword}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        value={value}
        onChange={onChange}
        {...props}
      />
    </>
  );
}

export default PasswordInput;
