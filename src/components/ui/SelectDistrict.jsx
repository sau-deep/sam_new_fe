import styles from "components/reports/DataQueryForm.module.css";
import { MenuItem, Select } from "@mui/material";

function SelectDistrict({ districtList, selectedDistrict, onLocationChange }) {
  return (
    <>
      <Select
        fullWidth
        className={styles["form-input"]}
        name="district"
        id="district"
        onChange={onLocationChange}
        value={selectedDistrict}
        inputProps={{ "aria-label": "Without label" }}
        displayEmpty
      >
        <MenuItem disabled value="">
          Select District
        </MenuItem>

        {districtList ? (
          districtList?.map((district) => {
            return (
              <MenuItem key={district.id} value={district.name}>
                {district.name}
              </MenuItem>
            );
          })
        ) : (
          <MenuItem disabled value="">
            Select Year & State <br /> to get districts!
          </MenuItem>
        )}
      </Select>
    </>
  );
}

export default SelectDistrict;
