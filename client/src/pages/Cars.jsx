import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { searchCars } from "../redux/slice/carSlice";
import CarCard from "../components/cars/CarCard";

import {
  Box, Button, Container, Typography, Grid, Alert, Paper, Stack, Divider,
  LocationAutocomplete, RentalDatePicker, Select
} from "../components";

import { Slider } from "@mui/material";

const TYPES = [
  { label: "All types", value: "all" },
  { label: "Electric", value: "ev" },
  { label: "Luxury", value: "luxury" },
  { label: "Sedan", value: "sedan" },
];

const SORTS = [
  { label: "Recommended", value: "recommended" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
];

const DEFAULT_HOUSTON = {
  id: "houston-tx-77001",
  primary: "Houston, TX 77001",
  subtitle: "Houston, Texas",
  raw: { address: { city: "Houston", state: "TX", postcode: "77001" } },
};

const getArea = (o) => {
  const a = o?.raw?.address || {};
  return {
    city: a.city || a.town || a.village || a.municipality || "",
    state: a.state || a.region || "",
    zip: String(a.postcode || "").match(/\b\d{5}\b/)?.[0] || "",
  };
};

export default function Cars() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cars = [], loading, error } = useSelector((s) => s.cars || {});

  const [type, setType] = useState("all");
  const [sort, setSort] = useState("recommended");
  const [pickup, setPickup] = useState(dayjs());
  const [drop, setDrop] = useState(dayjs().add(3, "day"));
  const [locVal, setLocVal] = useState(DEFAULT_HOUSTON);
  const [locInput, setLocInput] = useState(DEFAULT_HOUSTON.primary);

  // ✅ price slider state
  const [price, setPrice] = useState([0, 300]); // min/max

  // ✅ derive global min/max from cars returned (so slider always shows all cars)
  const minMax = useMemo(() => {
    if (!cars.length) return [0, 300];
    const prices = cars.map((c) => Number(c.price || 0));
    return [Math.min(...prices), Math.max(...prices)];
  }, [cars]);

  // ✅ keep slider max always covering ALL cars
  useEffect(() => {
    const [minP, maxP] = minMax;
    setPrice([minP, maxP]);
  }, [minMax]);

  const datesValid = useMemo(() => dayjs(drop).isAfter(pickup, "day"), [pickup, drop]);
  const canSearch = !!locVal && !!pickup && !!drop && !!type && datesValid;

  const handlePickup = (d) => {
    setPickup(d);
    if (d && !dayjs(drop).isAfter(d, "day")) setDrop(d.add(1, "day"));
  };

  const doSearch = () => {
    const a = getArea(locVal);
    dispatch(
      searchCars({
        type,
        location: [a.city, a.state, a.zip].filter(Boolean).join(", "),
        pickupDate: pickup.format("MM/DD/YYYY"),
        returnDate: drop.format("MM/DD/YYYY"),
      })
    );
  };

  // initial load
  useEffect(() => {
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ local filter + sort (frontend)
  const filteredCars = useMemo(() => {
    const [minP, maxP] = price;

    let list = cars.filter((c) => {
      const p = Number(c.price || 0);
      return p >= minP && p <= maxP;
    });

    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [cars, price, sort]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fa", py: 4 }}>
      <Container maxWidth="lg">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h3" fontWeight={1000}>All Cars</Typography>
            <Typography color="text.secondary">
              Filter by location, dates, type, and price — then sort to find your best match.
            </Typography>
          </Box>
          <Button variant="outlined" onClick={() => navigate("/")}>Back to Home</Button>
        </Stack>

        <Paper sx={{ p: 3, borderRadius: 4, boxShadow: "0 18px 40px rgba(20,30,60,0.10)" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "2fr 1.2fr 1.2fr 1fr 1fr" },
              gap: 2,
              alignItems: "stretch",
            }}
          >
            {/* ✅ Make location wide + no ugly "H..." */}
            <LocationAutocomplete
              label="Pickup Location"
              placeholder="City, ZIP, or Airport"
              value={locVal}
              inputValue={locInput}
              onChange={setLocVal}
              onInputChange={(e, v) => setLocInput(v)}
              minChars={2}
              limit={10}
              sx={{ "& .MuiInputBase-root": { height: 56 } }}
            />

            <RentalDatePicker label="Pickup" value={pickup} onChange={handlePickup} minDate={dayjs()} />
            <RentalDatePicker label="Return" value={drop} onChange={setDrop} minDate={pickup.add(1, "day")} />

            <Select label="Type" value={type} onChange={(e) => setType(e.target.value)} options={TYPES} />
            <Select label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} options={SORTS} />
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr auto auto" }, gap: 2, alignItems: "center" }}>
            <Box>
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Price range (${price[0]} — ${price[1]})
              </Typography>
              <Slider
                value={price}
                onChange={(e, v) => setPrice(v)}
                min={minMax[0]}
                max={minMax[1]}
                valueLabelDisplay="auto"
                disableSwap
              />
            </Box>

            <Button
              variant="outlined"
              onClick={() => {
                setType("all");
                setSort("recommended");
                setLocVal(DEFAULT_HOUSTON);
                setLocInput(DEFAULT_HOUSTON.primary);
                setPickup(dayjs());
                setDrop(dayjs().add(3, "day"));
                setPrice(minMax);
                doSearch();
              }}
              sx={{ height: 48 }}
            >
              Clear
            </Button>

            <Button
              variant="contained"
              disabled={!canSearch || loading}
              onClick={doSearch}
              sx={{ height: 48, borderRadius: 3, fontWeight: 900 }}
            >
              Search
            </Button>
          </Box>

          <Typography variant="caption" sx={{ mt: 1.5, display: "block", color: "text.secondary" }}>
            Tip: Choose a dropdown suggestion for best results.
          </Typography>
        </Paper>

        <Box sx={{ mt: 4 }}>
          {loading ? (
            <Typography>Loading cars…</Typography>
          ) : error ? (
            <Alert severity="error">{String(error)}</Alert>
          ) : filteredCars.length ? (
            <Grid container spacing={4} justifyContent="center">
              {filteredCars.map((c) => (
                <Grid item xs={12} sm={6} md={4} key={c._id} sx={{ display: "flex", justifyContent: "center" }}>
                  <CarCard car={c} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">No cars match your filters.</Alert>
          )}
        </Box>
      </Container>
    </Box>
  );
}