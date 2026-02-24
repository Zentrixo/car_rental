import React, { useMemo } from "react";
import { Autocomplete, TextField, InputAdornment } from "@mui/material";
import { LocationOn } from "@mui/icons-material";
import { LOCATIONS } from "../../data/locations";

export default function LocationAutocomplete({
  label = "Pickup Location",
  placeholder = "City, ZIP, or Airport",
  helperText = "",
  value,
  onChange,
  inputValue,
  onInputChange,
  minChars = 2,
  limit = 10,
  disabled = false,
  sx = {},                 // ✅ FIX: define sx here
}) {
  const options = useMemo(() => {
    const q = (inputValue || "").trim().toLowerCase();
    if (q.length < minChars) return [];

    const filtered = LOCATIONS.filter((x) => {
      const city = (x?.raw?.address?.city || "").toLowerCase();
      const state = (x?.raw?.address?.state || "").toLowerCase();
      const zip = String(x?.raw?.address?.postcode || "");
      const primary = (x?.primary || "").toLowerCase();
      return (
        city.includes(q) ||
        state.includes(q) ||
        zip.startsWith(q) ||
        primary.includes(q)
      );
    });

    return filtered.slice(0, limit);
  }, [inputValue, minChars, limit]);

  return (
    <Autocomplete
      fullWidth
      disableClearable={false}
      options={options}
      value={value}
      onChange={(e, v) => onChange?.(v)}
      inputValue={inputValue}
      onInputChange={(e, v) => onInputChange?.(e, v)}
      getOptionLabel={(opt) => opt?.primary || ""}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      disabled={disabled}
      sx={{ ...sx }}        // ✅ FIX: now sx exists
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <LocationOn />
              </InputAdornment>
            ),
          }}
        />
      )}
    />
  );
}