// client/src/components/common/LocationAutocomplete.jsx
import React, { useMemo, useState } from "react";
import { Autocomplete, TextField, InputAdornment } from "@mui/material";
import { LocationOn } from "@mui/icons-material";
import { LOCATIONS } from "../../data/locations";

function normalizeLocation(loc, idx) {
  // If it's already in the "rich" format, keep it
  if (loc?.primary && (loc?.raw?.address || loc?.zip)) {
    const zip =
      String(loc?.raw?.address?.postcode || loc?.zip || "").match(/\b\d{5}\b/)?.[0] || "";
    const city = loc?.raw?.address?.city || loc?.city || "";
    const state = loc?.raw?.address?.state || loc?.state || "";
    return {
      id: loc?.id ?? `${city}-${state}-${zip}-${idx}`,
      primary: loc.primary,
      subtitle: loc.subtitle || `${city}, ${state} ${zip}`.trim(),
      zip,
      raw: loc.raw || { address: { city, state, postcode: zip } },
      _src: loc,
    };
  }

  // Your current simple format: { city, state, zip }
  const city = loc?.city || "";
  const state = loc?.state || "";
  const zip = String(loc?.zip || "").match(/\b\d{5}\b/)?.[0] || "";

  return {
    id: `${city}-${state}-${zip}-${idx}`,
    primary: `${city}, ${state} ${zip}`.trim(),
    subtitle: "United States",
    zip,
    raw: { address: { city, state, postcode: zip } },
    _src: loc,
  };
}

export default function LocationAutocomplete({
  label = "City / State / ZIP",
  placeholder = "e.g., Houston or 77001",
  helperText = "",
  value, // optional (controlled)
  onChange,
  inputValue, // optional (controlled)
  onInputChange,
  minChars = 2,
  limit = 10,
  disabled = false,
  sx = {},
}) {
  // uncontrolled fallback
  const [internalValue, setInternalValue] = useState(null);
  const [internalInput, setInternalInput] = useState("");

  const effectiveValue = value !== undefined ? value : internalValue;
  const effectiveInput = inputValue !== undefined ? inputValue : internalInput;

  // ✅ normalize once
  const allOptions = useMemo(() => {
    return (LOCATIONS || []).map((loc, idx) => normalizeLocation(loc, idx));
  }, []);

  const options = useMemo(() => {
    const q = (effectiveInput || "").trim().toLowerCase();
    if (q.length < minChars) return [];

    const isZip = /^\d{1,5}$/.test(q);

    const filtered = allOptions.filter((x) => {
      const city = String(x?.raw?.address?.city || "").toLowerCase();
      const state = String(x?.raw?.address?.state || "").toLowerCase();
      const zip = String(x?.raw?.address?.postcode || x?.zip || "");
      const primary = String(x?.primary || "").toLowerCase();
      const subtitle = String(x?.subtitle || "").toLowerCase();

      if (isZip) return zip.startsWith(q);

      return (
        city.includes(q) ||
        state.includes(q) ||
        primary.includes(q) ||
        subtitle.includes(q) ||
        zip.startsWith(q)
      );
    });

    return filtered.slice(0, limit);
  }, [effectiveInput, minChars, limit, allOptions]);

  const noOptionsText =
    (effectiveInput || "").trim().length < minChars
      ? `Type at least ${minChars} characters (e.g., Hou or 770)`
      : "No locations found.";

  return (
    <Autocomplete
      fullWidth
      options={options}
      value={effectiveValue}
      inputValue={effectiveInput}
      disabled={disabled}
      sx={{ ...sx }}
      filterOptions={(x) => x} // prevent MUI double filtering
      noOptionsText={noOptionsText}
      onChange={(e, v) => {
        if (value === undefined) setInternalValue(v);
        onChange?.(v);
      }}
      onInputChange={(e, v) => {
        if (inputValue === undefined) setInternalInput(v);
        onInputChange?.(e, v);
      }}
      getOptionLabel={(opt) => opt?.primary || ""}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
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
      renderOption={(props, option) => (
        <li {...props} key={option.id} style={{ padding: 12 }}>
          <div>
            <div style={{ fontWeight: 800, lineHeight: 1.2 }}>{option.primary}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>
              {option.raw?.address?.city}, {option.raw?.address?.state} {option.raw?.address?.postcode}
            </div>
          </div>
        </li>
      )}
    />
  );
}