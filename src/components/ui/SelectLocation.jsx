import styles from "components/reports/DataQueryForm.module.css";
import { FormHelperText, ListSubheader, MenuItem, Select } from "@mui/material";

function SelectLocation({ stateList, selectedState, onLocationChange }) {
  console.log(stateList);
  return (
    <>
      <Select
        fullWidth
        inputProps={{ "aria-label": "Without label" }}
        displayEmpty
        className={styles["form-input"]}
        name="location"
        id="location"
        onChange={onLocationChange}
        value={selectedState}
        required
      >
        <MenuItem disabled value="">
          Select Location
        </MenuItem>

        <ListSubheader
          style={{
            background: "#f5f5f6",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          Country
        </ListSubheader>
        <MenuItem key="1947" value="INDIA">
          INDIA
        </MenuItem>

        <ListSubheader
          style={{
            background: "#f5f5f6",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          States
        </ListSubheader>

        {stateList ? (
          stateList?.map((state) => {
            return (
              state.locationType === "STATE" && (
                <MenuItem key={state.id} value={state.name}>
                  {state.name}
                </MenuItem>
              )
            );
          })
        ) : (
          <p className="p-3 pb-0">Select Year to get states!</p>
        )}

        <ListSubheader
          style={{
            background: "#f5f5f6",
            fontWeight: "bold",
            fontSize: "1rem",
          }}
        >
          UTs
        </ListSubheader>

        {stateList ? (
          stateList?.map((state) => {
            return (
              state.locationType === "UNION TERRITORY" && (
                <MenuItem key={state.id} value={state.name}>
                  {state.name}
                </MenuItem>
              )
            );
          })
        ) : (
          <></>
        )}
      </Select>
      <FormHelperText style={{ fontWeight: "500" }}>
        Select Year to load all location!
      </FormHelperText>
    </>
  );
}

export default SelectLocation;
