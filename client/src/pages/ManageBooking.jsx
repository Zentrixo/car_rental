// client/src/pages/ManageBooking.jsx
import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { searchReservation, clearResults } from "../redux/slice/manageBookingSlice";
import { generateAgreementPdf } from "../utils/generateAgreementPdf";

import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  Stack,
  Paper,
  Divider,
  Alert,
  Chip,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  useMediaQuery,
  Header,
  Footer,
  LocationAutocomplete,
} from "../components";

import { Person, Badge, Visibility, Replay, Cancel, Description } from "@mui/icons-material";

/* =========================
   helpers
========================= */
const statusColor = (s) => (s === "UPCOMING" ? "primary" : s === "CANCELLED" ? "error" : "default");
const payColor = (s) => (s === "PAID" ? "success" : s === "UNPAID" ? "warning" : "default");

const getArea = (v) => {
  const a = v?.raw?.address || {};
  return {
    zip: String(a.postcode || "").match(/\b\d{5}\b/)?.[0] || "",
    city: (a.city || a.town || a.village || "").toLowerCase(),
    state: (a.state || a.region || "").toUpperCase(),
  };
};

const fmtDate = (d) => (d ? dayjs(d).format("MMM D, YYYY") : "—");

/* =========================
   modal: booking details
========================= */
function BookingDetails({ open, onClose, b }) {
  if (!b) return null;
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 950 }}>
        Reservation Details
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 10, top: 10 }}>
          ✕
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <Typography fontWeight={950}>{b.car?.makeModel || "Reservation"}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            #{b.reservationNumber} • ZIP {b.zipCode}
          </Typography>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={b.status || "—"} size="small" color={statusColor(b.status)} />
            <Chip label={b.paymentStatus || "—"} size="small" color={payColor(b.paymentStatus)} />
            {b.car?.type ? <Chip label={b.car.type} size="small" /> : null}
          </Stack>

          <Divider />

          <Typography variant="body2">
            {fmtDate(b.pickupDate)} → {fmtDate(b.returnDate)}
          </Typography>
          <Typography variant="body2">Pickup: {b.pickupLocation || "—"}</Typography>
          <Typography variant="body2">Return: {b.returnLocation || "—"}</Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/* =========================
   modal: cancel confirmation
========================= */
function CancelConfirmDialog({ open, onClose, booking, onConfirm }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 950 }}>
        Cancel reservation?
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 10, top: 10 }}>
          ✕
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          This will cancel reservation <b>#{booking?.reservationNumber || "—"}</b>.
        </Typography>

        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
          Are you sure to cancel this reservation ?
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: "flex-end" }}>
          <Button onClick={onClose}>No</Button>
          <Button variant="contained" color="error" onClick={onConfirm} disabled={booking?.status !== "UPCOMING"}>
            Yes, Cancel
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/* =========================
   page
========================= */
export default function ManageBooking() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:900px)");
  const isSmall = useMediaQuery("(max-width:600px)");

  const { results = [], loading, error } = useSelector((s) => s.manageBooking || {});

  // search form
  const [lastName, setLastName] = useState("");
  const [resNo, setResNo] = useState("");
  const [locVal, setLocVal] = useState(null);
  const [locInput, setLocInput] = useState("");
  const [msg, setMsg] = useState(null);

  // show results only after a search attempt
  const [hasSearched, setHasSearched] = useState(false);

  // dialogs
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const area = useMemo(() => getArea(locVal), [locVal]);

  const canSearch =
    lastName.trim().length >= 2 &&
    resNo.trim().length >= 4 &&
    /^\d{5}$/.test(area.zip) &&
    !!locVal;

  const resetFeedback = () => {
    setMsg(null);
    setHasSearched(false);
    dispatch(clearResults());
  };

  const handleSearch = async () => {
    setMsg(null);

    if (!canSearch) {
      setMsg("Enter Last Name, Reservation Number, and choose a City/ZIP suggestion.");
      setHasSearched(true);
      return;
    }

    setHasSearched(true);

    const action = await dispatch(
      searchReservation({
        lastName: lastName.trim(),
        reservationNumber: resNo.trim().toUpperCase(),
        location: area,
      })
    );

    if (searchReservation.rejected.match(action)) {
      setMsg(action.payload || "No reservation found.");
      return;
    }

    const n = (action.payload?.results || []).length;
    setMsg(n ? `Found ${n} reservation(s).` : "No reservation found.");
  };

  const handleClear = () => {
    setLastName("");
    setResNo("");
    setLocVal(null);
    setLocInput("");
    setMsg(null);
    setHasSearched(false);
    dispatch(clearResults());
  };

  const openDetails = (b) => {
    setSelected(b);
    setDetailsOpen(true);
  };

  const openCancel = (b) => {
    setCancelTarget(b);
    setCancelOpen(true);
  };

  const confirmCancel = async () => {
    setCancelOpen(false);
    alert("Cancel confirmed (backend hookup next).");
  };

  const downloadAgreement = (b) => {
    const safeBooking = {
      ...b,
      car: b?.car || { makeModel: "Vehicle", type: "", imageUrl: "" },
      pickupLocation: b?.pickupLocation || locVal?.primary || "",
      returnLocation: b?.returnLocation || b?.pickupLocation || "",
      zipCode: b?.zipCode || area.zip || "",
    };

    generateAgreementPdf({
      booking: safeBooking,
      customer: {
        lastName: lastName.trim() || safeBooking.lastName || "",
        reservationNumber: resNo.trim() || safeBooking.reservationNumber || "",
        pickupLocation: locVal?.primary || safeBooking.pickupLocation || "",
      },
    });
  };

  const buildRebookPayload = (b) => {
    const end = b?.returnDate ? dayjs(b.returnDate) : dayjs();
    const newStart = end.add(1, "month");
    const newEnd = newStart.add(1, "year");

    return {
      ...b,
      pickupDate: newStart.toISOString(),
      returnDate: newEnd.toISOString(),
      rebookFromReservationNumber: b?.reservationNumber,
      pickupLocation: b?.pickupLocation || locVal?.primary || "",
      returnLocation: b?.returnLocation || b?.pickupLocation || "",
    };
  };

  const handleRebook = (b) => {
    const payload = buildRebookPayload(b);
    navigate("/book", { state: { rebook: true, booking: payload } });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f7fb", display: "flex", flexDirection: "column" }}>
      <Header />

      {/* HERO */}
      <Box
        sx={{
          position: "relative",
          color: "white",
          overflow: "hidden",
          background: "linear-gradient(135deg, #0b1a66 0%, #1A237E 40%, #2E7D32 140%)",
          pt: { xs: 6, md: 8 },
          pb: { xs: 7, md: 8 }, // ✅ IMPORTANT: less bottom padding so card doesn't get hidden
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(900px 360px at 25% 25%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(900px 360px at 75% 25%, rgba(255,255,255,0.10), transparent 60%)",
            pointerEvents: "none",
          }}
        />

        <Container sx={{ position: "relative" }}>
          <Typography
            variant={isMobile ? "h4" : "h3"}
            textAlign="center"
            fontWeight={1000}
            sx={{ letterSpacing: 0.2 }}
          >
            Manage Your Booking
          </Typography>
          <Typography
            textAlign="center"
            sx={{
              opacity: 0.92,
              maxWidth: 780,
              mx: "auto",
              mt: 1.2,
              fontSize: { xs: 13, md: 15 },
            }}
          >
            Find your reservation, view details, download your agreement, cancel (if eligible),
            or rebook in one click.
          </Typography>
        </Container>
      </Box>

      {/* CONTENT */}
      <Container
        maxWidth="md"
        sx={{
          mt: { xs: 2.5, md: 3 }, // ✅ IMPORTANT: no negative margin — prevents hiding inputs
          pb: 5,
          flexGrow: 1,
        }}
      >
        {/* SEARCH CARD */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, md: 3 },
            borderRadius: 6,
            border: "1px solid #e8ebf3",
            bgcolor: "rgba(255,255,255,0.95)",
            boxShadow: "0 18px 38px rgba(20,30,60,0.12)",
          }}
        >
          <Stack spacing={2}>
            <Stack spacing={0.4}>
              <Typography sx={{ fontWeight: 1000, fontSize: 18 }}>
                Find Reservation
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Please enter details exactly as on your reservation.
              </Typography>
            </Stack>

            {msg && (
              <Alert severity={msg.includes("Found") ? "success" : "warning"} onClose={() => setMsg(null)}>
                {msg}
              </Alert>
            )}
            {error && <Alert severity="error">{String(error)}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="Last Name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  resetFeedback();
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                label="Reservation Number"
                value={resNo}
                onChange={(e) => {
                  setResNo(e.target.value);
                  resetFeedback();
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge />
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>

            <LocationAutocomplete
              label="City / State / ZIP"
              placeholder="e.g., Houston or 77001"
              value={locVal}
              inputValue={locInput}
              onChange={(v) => {
                setLocVal(v);
                resetFeedback();
              }}
              onInputChange={(e, v) => setLocInput(v)}
              minChars={2}
              limit={10}
              sx={{ "& .MuiInputBase-root": { height: 56 } }}
            />

            {/* fancy hint row */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip size="small" variant="outlined" label="Tip: Type “Hou” or “77001”" />
              <Chip size="small" variant="outlined" label="ZIP must be present" />
              <Chip size="small" variant="outlined" label="Reservation # is case-insensitive" />
            </Stack>

            <Divider />

            <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
              <Button
                variant="contained"
                size="large"
                disabled={!canSearch || loading}
                onClick={handleSearch}
                sx={{ px: 3, borderRadius: 3, fontWeight: 900 }}
              >
                {loading ? "Searching..." : "Find Reservation"}
              </Button>
              <Button variant="text" onClick={handleClear} sx={{ fontWeight: 800 }}>
                Clear
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {/* RESULTS (only after a search attempt) */}
        {hasSearched && (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: { xs: 2, md: 2.5 },
              borderRadius: 6,
              border: "1px solid #e8ebf3",
              bgcolor: "white",
              boxShadow: "0 18px 38px rgba(20,30,60,0.10)",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.25 }}>
              <Box>
                <Typography sx={{ fontWeight: 1000, fontSize: 18 }}>Reservations</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                  {results.length ? "Manage your reservation below." : "No matching reservations found."}
                </Typography>
              </Box>

              {results.length ? (
                <Chip label={`${results.length} found`} size="small" color="primary" variant="outlined" />
              ) : null}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {!results.length ? (
              <Box sx={{ py: 3, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 900 }}>No reservation found</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Please double-check spelling, reservation number, and ensure you selected a location suggestion.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {results.map((b) => (
                  <Card
                    key={b._id || b.id}
                    elevation={0}
                    sx={{
                      borderRadius: 5,
                      border: "1px solid #eceff7",
                      bgcolor: "white",
                      overflow: "hidden",
                      boxShadow: "0 12px 24px rgba(15, 30, 60, 0.08)",
                    }}
                  >
                    <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", md: "center" }}
                        justifyContent="space-between"
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography sx={{ fontWeight: 1000, fontSize: 16 }}>
                              {b.car?.makeModel || "Reservation"}
                            </Typography>
                            <Chip label={b.status || "—"} size="small" color={statusColor(b.status)} />
                            <Chip label={b.paymentStatus || "—"} size="small" color={payColor(b.paymentStatus)} />
                          </Stack>

                          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                            <b>#{b.reservationNumber}</b> • ZIP {b.zipCode}
                          </Typography>

                          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
                            {fmtDate(b.pickupDate)} → {fmtDate(b.returnDate)}
                          </Typography>

                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                            Pickup: {b.pickupLocation || "—"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                            Return: {b.returnLocation || "—"}
                          </Typography>
                        </Box>

                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            borderRadius: 4,
                            borderColor: "#eef0f6",
                            bgcolor: "#fbfcff",
                            width: { xs: "100%", md: "auto" },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              fontWeight: 900,
                              display: "block",
                              mb: 1,
                              letterSpacing: 0.35,
                            }}
                          >
                            ACTIONS
                          </Typography>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ width: "100%", minWidth: { md: 420 } }}
                          >
                            <Button
                              size={isSmall ? "medium" : "small"}
                              variant="outlined"
                              onClick={() => openDetails(b)}
                              startIcon={<Visibility />}
                              sx={{ borderRadius: 3, fontWeight: 900 }}
                              fullWidth={isSmall}
                            >
                              Details
                            </Button>

                            <Button
                              size={isSmall ? "medium" : "small"}
                              variant="outlined"
                              onClick={() => downloadAgreement(b)}
                              startIcon={<Description />}
                              sx={{ borderRadius: 3, fontWeight: 900 }}
                              fullWidth={isSmall}
                            >
                              Agreement
                            </Button>

                            <Button
                              size={isSmall ? "medium" : "small"}
                              variant="outlined"
                              onClick={() => handleRebook(b)}
                              startIcon={<Replay />}
                              sx={{ borderRadius: 3, fontWeight: 900 }}
                              fullWidth={isSmall}
                            >
                              Rebook
                            </Button>

                            <Button
                              size={isSmall ? "medium" : "small"}
                              variant="contained"
                              color="error"
                              onClick={() => setCancelTarget(b) || setCancelOpen(true)}
                              startIcon={<Cancel />}
                              disabled={b.status !== "UPCOMING"}
                              sx={{ borderRadius: 3, fontWeight: 900 }}
                              fullWidth={isSmall}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </Paper>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ px: { xs: 2, md: 2.5 }, pb: 2, pt: 0 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Need help? Visit <b>Support</b> or contact us with your reservation number.
                      </Typography>
                    </CardActions>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        )}
      </Container>

      <Footer />

      <BookingDetails open={detailsOpen} onClose={() => setDetailsOpen(false)} b={selected} />

      <CancelConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        booking={cancelTarget}
        onConfirm={() => {
          setCancelOpen(false);
          alert("Cancel confirmed (backend hookup next).");
        }}
      />
    </Box>
  );
}