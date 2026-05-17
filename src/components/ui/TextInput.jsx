import { InputAdornment, TextField } from "@mui/material";
import React from "react";
import styles from "styles/form-styles.module.css";

function TextInput({
  value,
  onChange,
  label,
  name,
  placeholder,
  icon,
  ...props
}) {
  return (
    <>
      <label className={styles.label}>
        {label}
        <span style={{ color: "red" }}> *</span>
      </label>

      <TextField
        fullWidth
        size="small"
        required
        id={name}
        name={name}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">{icon}</InputAdornment>
          ),
        }}
        value={value}
        onChange={onChange}
        {...props}
      />
    </>
  );
}

export default TextInput;
