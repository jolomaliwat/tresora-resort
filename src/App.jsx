import React, { useEffect, useState } from "react";

const SPREADSHEET_API_URL =
  "https://script.google.com/macros/s/AKfycbyaJ2x2dlzSzmLvRevF-BJV7idIs2VmhYlpVyz9a4FyG93OvnA7Zt3tUOtVELTvlqO_uA/exec";

// Updated stats based on listing details
const resortHighlights = [
  { label: "Max Capacity", value: "34 Guests" },
  { label: "Stay Duration", value: "22 Hours" },
  { label: "Guest Satisfaction", value: "100%" },
];

const galleryImages = [
  { src: "/farm-1.jpg", alt: "Tresora farm landscape" },
  { src: "/farm-2.jpg", alt: "Fresh produce at Tresora" },
  { src: "/farm-3.jpg", alt: "Countryside views at Tresora" },
  { src: "/resort-1.jpg", alt: "Tresora resort grounds" },
  { src: "/resort-2.jpg", alt: "Tresora guest cottage" },
  { src: "/resort-3.jpg", alt: "Riverside escape at Tresora" },
  { src: "/resort-4.jpg", alt: "Evening at Tresora" },
];

export default function ResortBooking() {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "18",
    referenceNumber: "",
    receiptFile: null,
  });

  const [status, setStatus] = useState({
    loading: false,
    success: false,
    error: "",
  });

  const [activeImage, setActiveImage] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Dynamic Spreadsheet Sync State
  const [bookedDates, setBookedDates] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Fetch booked dates from Google Spreadsheet
  const fetchBookedDates = async () => {
    try {
      const response = await fetch(SPREADSHEET_API_URL);
      const data = await response.json();
      if (data && data.bookedDates) {
        setBookedDates(data.bookedDates);
      }
    } catch (err) {
      console.error("Failed to fetch booked dates:", err);
    }
  };

  useEffect(() => {
    fetchBookedDates();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleCount = isMobile ? 1 : 3;
  const maxSlide = Math.max(0, galleryImages.length - visibleCount);

  useEffect(() => {
    document.title = "Tresora Tanay Farm and Resort";

    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }
    link.type = "image/svg+xml";
    link.href =
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌴</text></svg>";
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setActiveImage(null);
      if (activeImage && e.key === "ArrowRight") {
        const i = galleryImages.findIndex((x) => x.src === activeImage.src);
        setActiveImage(galleryImages[(i + 1) % galleryImages.length]);
      }
      if (activeImage && e.key === "ArrowLeft") {
        const i = galleryImages.findIndex((x) => x.src === activeImage.src);
        setActiveImage(
          galleryImages[(i - 1 + galleryImages.length) % galleryImages.length],
        );
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeImage]);

  const todayStr = new Date().toISOString().split("T")[0];

  const formatDateStr = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  const isDateBooked = (dateStr) => bookedDates.includes(dateStr);

  const isDateRangeBooked = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    let curr = new Date(startStr);
    const end = new Date(endStr);

    while (curr <= end) {
      const formatted = curr.toISOString().split("T")[0];
      if (bookedDates.includes(formatted)) return true;
      curr.setDate(curr.getDate() + 1);
    }
    return false;
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((prev) => ({
            ...prev,
            receiptFile: {
              name: file.name,
              type: file.type,
              base64: reader.result,
            },
          }));
        };
        reader.readAsDataURL(file);
      }
    } else if (name === "checkIn") {
      setFormData((prev) => {
        const updatedCheckOut =
          prev.checkOut && prev.checkOut < value ? "" : prev.checkOut;
        return { ...prev, checkIn: value, checkOut: updatedCheckOut };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCalendarDayClick = (dateStr) => {
    if (isDateBooked(dateStr) || dateStr < todayStr) return;

    if (!formData.checkIn || (formData.checkIn && formData.checkOut)) {
      setFormData((prev) => ({ ...prev, checkIn: dateStr, checkOut: "" }));
    } else if (formData.checkIn && !formData.checkOut) {
      if (dateStr < formData.checkIn) {
        setFormData((prev) => ({ ...prev, checkIn: dateStr, checkOut: "" }));
      } else {
        if (isDateRangeBooked(formData.checkIn, dateStr)) {
          setStatus({
            loading: false,
            success: false,
            error: "Selected stay contains dates that are already booked.",
          });
          return;
        }
        setStatus((prev) => ({ ...prev, error: "" }));
        setFormData((prev) => ({ ...prev, checkOut: dateStr }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, success: false, error: "" });

    if (!formData.receiptFile) {
      setStatus({
        loading: false,
        success: false,
        error: "Please attach your payment receipt before submitting.",
      });
      return;
    }

    if (formData.checkOut < formData.checkIn) {
      setStatus({
        loading: false,
        success: false,
        error: "Check-out date cannot be earlier than check-in date.",
      });
      return;
    }

    if (isDateRangeBooked(formData.checkIn, formData.checkOut)) {
      setStatus({
        loading: false,
        success: false,
        error: "Your requested dates include days that are already booked.",
      });
      return;
    }

    try {
      await fetch(SPREADSHEET_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(formData),
      });

      setStatus({ loading: false, success: true, error: "" });
      setFormData({
        fullName: "",
        phone: "",
        email: "",
        checkIn: "",
        checkOut: "",
        guests: "18",
        referenceNumber: "",
        receiptFile: null,
      });

      await fetchBookedDates();
    } catch (err) {
      console.error(err);
      setStatus({
        loading: false,
        success: false,
        error: "Failed to submit booking. Please try again.",
      });
    }
  };

  const moveGallery = (direction) => {
    setCurrentSlide((prev) => {
      const next = prev + direction;
      if (next < 0) return 0;
      if (next > maxSlide) return maxSlide;
      return next;
    });
  };

  const openLightbox = (image) => setActiveImage(image);

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString("default", { month: "long" });
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const changeMonth = (offset) => {
    setCalendarDate(new Date(year, month + offset, 1));
  };

  return (
    <main className="tresora-site">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600&family=Allura&display=swap');

        :root {
          --green: #263a20;
          --green-2: #405a32;
          --cream: #f7f3e8;
          --cream-2: #eee8d8;
          --gold: #b59b63;
          --text: #20241b;
          --muted: #707464;
          --white: #fffdf8;
          --line: rgba(38,58,32,.16);
          --booked: #d9534f;
        }

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        body {
          margin: 0;
          background: var(--cream);
          color: var(--text);
          font-family: "DM Sans", sans-serif;
          overflow-x: hidden;
        }

        button, input { font: inherit; }
        button { cursor: pointer; }

        .tresora-site {
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          background: var(--cream);
        }

        /* HERO */
        .hero {
          min-height: 92vh;
          position: relative;
          display: flex;
          align-items: center;
          color: white;
          background:
            linear-gradient(90deg, rgba(16,27,13,.88) 0%, rgba(16,27,13,.75) 50%, rgba(16,27,13,.45) 100%),
            url("/resort-1.jpg") center/cover no-repeat;
        }

        .hero::after {
          content: "";
          position: absolute;
          inset: auto 0 0;
          height: 180px;
          background: linear-gradient(transparent, rgba(247,243,232,.35));
          pointer-events: none;
        }

        .nav {
          position: absolute;
          z-index: 5;
          top: 0;
          left: 0;
          right: 0;
          height: 86px;
          padding: 0 clamp(1.2rem, 5vw, 5rem);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,.16);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: .75rem;
          color: white;
          text-decoration: none;
          letter-spacing: .18em;
          font-family: "Playfair Display", serif;
          font-size: 1.3rem;
        }

        .logo-mark {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.75);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: .9rem;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .nav-links a {
          color: rgba(255,255,255,.9);
          text-decoration: none;
          font-size: .86rem;
          transition: opacity .25s ease;
        }

        .nav-links a:hover { opacity: .65; }

        .hero-content {
          position: relative;
          z-index: 2;
          width: min(1280px, 100%);
          margin: 0 auto;
          padding: 8rem 1.5rem 5rem;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(2rem, 5vw, 4rem);
          align-items: center;
        }

        .eyebrow {
          margin: 0 0 1rem;
          text-transform: uppercase;
          letter-spacing: .3em;
          font-size: .72rem;
          color: #e8d9ad;
        }

        .hero h1 {
          margin: 0;
          max-width: 800px;
          font-family: "Playfair Display", serif;
          font-size: clamp(3.2rem, 6vw, 5.5rem);
          font-weight: 400;
          line-height: .95;
          letter-spacing: -.045em;
        }

        .script {
          display: block;
          margin-top: .35rem;
          font-family: "Allura", cursive;
          font-size: clamp(2rem, 4vw, 3.2rem);
          color: #f0dfb3;
          letter-spacing: .02em;
        }

        .hero-description {
          max-width: 530px;
          margin: 1.5rem 0 0;
          font-size: .95rem;
          line-height: 1.8;
          color: rgba(255,255,255,.82);
        }

        .hero-actions {
          margin-top: 2rem;
          display: flex;
          gap: .8rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .primary-btn, .outline-btn {
          border-radius: 999px;
          padding: .9rem 1.35rem;
          text-decoration: none;
          font-size: .8rem;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          transition: transform .25s ease, background .25s ease;
        }

        .primary-btn {
          color: var(--green);
          background: #f4edda;
          border: 1px solid #f4edda;
        }

        .outline-btn {
          color: white;
          border: 1px solid rgba(255,255,255,.45);
          background: rgba(255,255,255,.06);
        }

        .primary-btn:hover, .outline-btn:hover {
          transform: translateY(-2px);
        }

        .hero-meta {
          margin-top: 2.5rem;
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .hero-stat strong {
          display: block;
          font-family: "Playfair Display", serif;
          font-size: 1.4rem;
          font-weight: 500;
        }

        .hero-stat span {
          color: rgba(255,255,255,.62);
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .12em;
        }

        .hero-map-card {
          background: rgba(255, 253, 248, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 1.25rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: .75rem;
        }

        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 .25rem;
        }

        .map-header h3 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 1.15rem;
          color: #f4edda;
          font-weight: 400;
        }

        .map-header span {
          font-size: .75rem;
          color: rgba(255, 255, 255, 0.65);
        }

        .map-frame-container {
          width: 100%;
          height: 380px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .map-frame-container iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        /* AMENITIES SECTION */
        .amenities-section {
          width: min(1180px, calc(100% - 2.5rem));
          margin: 0 auto;
          padding: 3rem 0 1rem;
        }

        .amenities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.2rem;
          margin-top: 1.5rem;
        }

        .amenity-card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 1.2rem;
          box-shadow: 0 4px 15px rgba(0,0,0,.03);
        }

        .amenity-card h4 {
          margin: 0 0 .4rem;
          font-family: "Playfair Display", serif;
          font-size: 1.1rem;
          color: var(--green);
        }

        .amenity-card p {
          margin: 0;
          font-size: .82rem;
          color: var(--muted);
          line-height: 1.5;
        }

        /* GALLERY */
        .gallery-section {
          padding: clamp(3rem, 6vw, 6rem) 0 4rem;
          background: var(--cream);
          overflow: hidden;
        }

        .section-head {
          width: min(1180px, calc(100% - 2.5rem));
          margin: 0 auto 2rem;
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 2rem;
        }

        .section-kicker {
          margin: 0 0 .45rem;
          color: var(--gold);
          font-size: .7rem;
          text-transform: uppercase;
          letter-spacing: .25em;
          font-weight: 700;
        }

        .section-title {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: clamp(2.2rem, 5vw, 4rem);
          font-weight: 400;
          line-height: 1;
        }

        .section-copy {
          max-width: 420px;
          color: var(--muted);
          line-height: 1.7;
          font-size: .9rem;
        }

        .carousel-wrap {
          position: relative;
          width: min(1180px, calc(100% - 2.5rem));
          margin: 0 auto;
          overflow: hidden;
        }

        .carousel-track {
          display: flex;
          gap: 16px;
          transition: transform .5s cubic-bezier(.25,1,.5,1);
          will-change: transform;
        }

        .gallery-card {
          flex: 0 0 calc((100% - 32px) / 3);
          height: clamp(280px, 34vw, 440px);
          padding: 0;
          border: 0;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          background: #1d2b1a;
          box-shadow: 0 12px 30px rgba(32,36,27,.12);
        }

        .gallery-card img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center;
        }

        .carousel-controls {
          width: min(1180px, calc(100% - 2.5rem));
          margin: 1.4rem auto 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .dots { display: flex; gap: .45rem; }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: 0;
          padding: 0;
          background: #c9c5b7;
          transition: transform .25s ease, background .25s ease;
        }

        .dot.active {
          background: var(--green);
          transform: scale(1.35);
        }

        .arrow-group { display: flex; gap: .55rem; }

        .arrow-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--green);
          font-size: 1.15rem;
          display: grid;
          place-items: center;
          transition: opacity .2s ease;
        }

        .arrow-btn:disabled {
          opacity: .3;
          cursor: not-allowed;
        }

        /* BOOKING & CALENDAR */
        .booking-section {
          position: relative;
          padding: clamp(3rem, 6vw, 6rem) 1rem;
          background:
            linear-gradient(100deg, rgba(29,48,23,.94), rgba(29,48,23,.82)),
            url("/farm-3.jpg") center/cover no-repeat;
          color: white;
          overflow: hidden;
        }

        .booking-inner {
          width: min(1180px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(2rem, 5vw, 3.5rem);
          align-items: start;
        }

        .calendar-card {
          background: rgba(255, 253, 248, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(12px);
          border-radius: 18px;
          padding: 1.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
          margin-top: 1.5rem;
        }

        .calendar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .calendar-header h3 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 1.25rem;
          color: #f4edda;
          font-weight: 500;
        }

        .cal-nav-btn {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          transition: background .2s;
        }

        .cal-nav-btn:hover { background: rgba(255, 255, 255, 0.25); }

        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: .7rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: .5rem;
          text-transform: uppercase;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 6px;
        }

        .cal-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: .8rem;
          font-weight: 500;
          border: none;
          background: rgba(255, 255, 255, 0.08);
          color: white;
          position: relative;
          transition: all .2s ease;
        }

        .cal-day.empty { background: transparent; cursor: default; }

        .cal-day.past {
          opacity: .35;
          cursor: not-allowed;
          background: transparent;
        }

        .cal-day.available {
          cursor: pointer;
          background: rgba(255, 255, 255, 0.15);
        }

        .cal-day.available:hover {
          background: #f4edda;
          color: var(--green);
        }

        .cal-day.booked {
          background: rgba(217, 83, 79, 0.35);
          color: #ff9b98;
          border: 1px solid rgba(217, 83, 79, 0.6);
          cursor: not-allowed;
          text-decoration: line-through;
        }

        .cal-day.selected {
          background: #f4edda !important;
          color: var(--green) !important;
          font-weight: 700;
          box-shadow: 0 0 10px rgba(244, 237, 218, 0.5);
        }

        .cal-day.in-range {
          background: rgba(244, 237, 218, 0.3) !important;
          color: white !important;
        }

        .calendar-legend {
          display: flex;
          gap: 1.25rem;
          margin-top: 1rem;
          font-size: .72rem;
          color: rgba(255, 255, 255, 0.75);
          justify-content: center;
        }

        .legend-item { display: flex; align-items: center; gap: .4rem; }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 3px;
        }

        .legend-dot.avail { background: rgba(255, 255, 255, 0.25); }
        .legend-dot.booked { background: var(--booked); }
        .legend-dot.selected { background: #f4edda; }

        .booking-intro .section-kicker { color: #d8c58e; }
        .booking-intro .section-title { color: white; }

        .booking-intro p {
          max-width: 470px;
          color: rgba(255,255,255,.68);
          line-height: 1.8;
        }

        .experience-list {
          margin-top: 1.8rem;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: .7rem;
        }

        .experience {
          padding: .9rem;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 10px;
          background: rgba(255,255,255,.045);
        }

        .experience strong {
          display: block;
          font-family: "Playfair Display", serif;
          font-size: 1rem;
          font-weight: 400;
        }

        .experience span {
          color: rgba(255,255,255,.58);
          font-size: .72rem;
        }

        .booking-card {
          background: rgba(255,253,248,.97);
          color: var(--text);
          border-radius: 18px;
          padding: clamp(1.2rem, 3.5vw, 2.2rem);
          box-shadow: 0 30px 80px rgba(0,0,0,.22);
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        .booking-card h2 {
          margin: 0;
          font-family: "Playfair Display", serif;
          font-size: 1.8rem;
          font-weight: 500;
        }

        .booking-card-subtitle {
          margin: .35rem 0 1.2rem;
          color: var(--muted);
          font-size: .82rem;
        }

        .booking-form {
          display: flex;
          flex-direction: column;
          gap: .9rem;
          width: 100%;
          box-sizing: border-box;
        }

        .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: .75rem;
          width: 100%;
          box-sizing: border-box;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: .3rem;
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
        }

        .field.full { grid-column: 1 / -1; }

        .field label {
          font-size: .68rem;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: #686b5f;
          font-weight: 700;
        }

        .field input {
          box-sizing: border-box;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          padding: .75rem .7rem;
          border: 1px solid #ddd9cd;
          border-radius: 8px;
          background: #fff;
          outline: none;
          color: var(--text);
          font-size: .85rem;
        }

        .field input[type="date"] {
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          min-height: 44px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          font-family: inherit;
        }

        .file-upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          padding: .75rem;
          border: 1px dashed #b5a98d;
          border-radius: 8px;
          background: #fcfbfa;
          color: var(--green);
          font-size: .78rem;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
        }

        .file-name-preview {
          margin-top: .25rem;
          font-size: .72rem;
          color: var(--green-2);
          font-weight: 500;
          word-break: break-all;
        }

        /* FLUID RESPONSIVE PAYMENT & QR BOX */
        .payment-box {
          margin-top: .2rem;
          padding: clamp(0.85rem, 2.5vw, 1.25rem);
          border-radius: 12px;
          background: var(--cream);
          border: 1px solid #e3dece;
          display: grid;
          grid-template-columns: minmax(130px, 170px) 1fr;
          gap: clamp(0.75rem, 2vw, 1.25rem);
          align-items: center;
          box-sizing: border-box;
          width: 100%;
        }

        .qr-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .qr {
          width: 100%;
          max-width: 170px;
          height: auto;
          aspect-ratio: 1 / 1;
          background: white;
          border-radius: 12px;
          border: 1px solid #ddd9cd;
          padding: 6px;
          object-fit: contain;
          box-shadow: 0 4px 12px rgba(0,0,0,.06);
        }

        .payment-box h3 { margin: 0 0 .25rem; font-size: .88rem; }

        .payment-box p {
          margin: 0 0 .6rem;
          color: var(--muted);
          font-size: .73rem;
          line-height: 1.4;
        }

        .submit-btn {
          width: 100%;
          border: 0;
          border-radius: 999px;
          padding: .95rem;
          background: var(--green);
          color: white;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .1em;
          font-size: .75rem;
        }

        .submit-btn:disabled { opacity: .55; cursor: not-allowed; }

        .success, .error {
          padding: .75rem .85rem;
          border-radius: 8px;
          font-size: .78rem;
          margin-bottom: .8rem;
        }

        .success { background: #e3ecd9; color: #304b27; border: 1px solid #aebe9d; }
        .error { background: #f5dfd8; color: #8b3e28; border: 1px solid #d7a595; }

        /* LIGHTBOX */
        .lightbox {
          position: fixed;
          inset: 0;
          z-index: 100;
          background: rgba(10, 15, 9, 0.96);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .lightbox img {
          max-width: 92vw;
          max-height: 85vh;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 8px;
        }

        .close, .light-nav {
          position: absolute;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.12);
          color: white;
          display: grid;
          place-items: center;
          font-size: 1.3rem;
        }

        .close { top: 1rem; right: 1rem; }
        .light-nav.prev { left: 1rem; }
        .light-nav.next { right: 1rem; }

        /* MOBILE MEDIA QUERIES */
        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hero { min-height: auto; }
          .hero-content { grid-template-columns: 1fr; padding-top: 6rem; gap: 2rem; }
          .booking-inner { grid-template-columns: 1fr; }
          .booking-card { padding: 1.25rem 1rem; }
          .gallery-card { flex: 0 0 100%; height: 350px; }
          .field-grid { grid-template-columns: 1fr; }
          .field.full { grid-column: auto; }
          
          .payment-box { 
            grid-template-columns: 1fr; 
            text-align: center; 
            justify-items: center;
          }
          .qr { 
            max-width: 200px;
            margin: 0 auto; 
          }
        }

        @media (max-width: 480px) {
          .qr {
            max-width: 150px;
          }
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="hero" id="home">
        <nav className="nav">
          <a className="logo" href="#home">
            <span className="logo-mark">✦</span> TRESORA
          </a>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#amenities">Offers</a>
            <a href="#gallery">Gallery</a>
            <a href="#booking">Stay</a>
            <a href="#booking">Contact</a>
          </div>
          <span style={{ color: "rgba(255,255,255,.8)", fontSize: ".78rem" }}>
            Tanay, Rizal
          </span>
        </nav>

        <div className="hero-content">
          <div className="hero-left">
            <p className="eyebrow">Private Farm & Resort</p>
            <h1>
              TRESORA
              <span className="script">Exclusive Countryside Getaway</span>
            </h1>
            <p className="hero-description">
              Escape the city and unwind in our private farm resort in Tanay,
              Rizal. Perfect for family outings, reunions, birthdays, and group
              gatherings. Enjoy exclusive access to the entire property with
              22-hour standard stays.
            </p>
            <div className="hero-actions">
              <a className="primary-btn" href="#gallery">
                Explore gallery →
              </a>
              <a className="outline-btn" href="#booking">
                Reserve stay
              </a>
            </div>
            <div className="hero-meta">
              {resortHighlights.map((item) => (
                <div className="hero-stat" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
              <a
                href="https://www.google.com/maps/place/Tresora+Tanay+Farm+and+Resort/@14.5140139,121.3284537,17z/data=!4m6!3m5!1s0x3397eb002c2a56ff:0x57164d5d0e657dac!8m2!3d14.5140139!4d121.3284537!16s%2Fg%2F11ytx37r1g"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: "#e8d9ad",
                  fontSize: "0.75rem",
                  textDecoration: "underline",
                  alignSelf: "center",
                  marginTop: "0.5rem",
                }}
              >
                Read Google Reviews ↗
              </a>
            </div>
          </div>

          <div className="hero-map-card">
            <div className="map-header">
              <h3>Tresora Tanay Farm and Resort</h3>
              <span>Near Daranak Falls, Tanay, Rizal</span>
            </div>
            <div className="map-frame-container">
              <iframe
                title="Tresora Tanay Farm and Resort Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3861.344840507342!2d121.32587881112453!3d14.514013889823908!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397eb002c2a56ff%3A0x57164d5d0e657dac!2sTresora%20Tanay%20Farm%20and%20Resort!5e0!3m2!1sen!2sph!4v1726000000000!5m2!1sen!2sph"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* AMENITIES SECTION */}
      <section className="amenities-section" id="amenities">
        <p className="section-kicker">What this place offers</p>
        <h2 className="section-title">Property Highlights</h2>
        <div className="amenities-grid">
          <div className="amenity-card">
            <h4>🏊 Private Infinity Pool</h4>
            <p>
              24-hour outdoor access, approx. 3ft–5ft depth for all-day
              swimming.
            </p>
          </div>
          <div className="amenity-card">
            <h4>🏡 Exclusive Rental</h4>
            <p>
              Entire property access — no sharing with other guests during your
              stay.
            </p>
          </div>
          <div className="amenity-card">
            <h4>🛏️ Rooms for Up to 34</h4>
            <p>
              3 air-conditioned rooms (Room 1: 18 pax | Room 2: 8 pax | Room 3:
              8 pax).
            </p>
          </div>
          <div className="amenity-card">
            <h4>🍳 Kitchen & BBQ Setup</h4>
            <p>
              Basic kitchen with fridge, cooking basics, pots, pans, and outdoor
              BBQ grill.
            </p>
          </div>
          <div className="amenity-card">
            <h4>🎱 Entertainment & Pavilion</h4>
            <p>
              Covered pavilion area equipped with pool table and TV for group
              gatherings.
            </p>
          </div>
          <div className="amenity-card">
            <h4>🔥 Firepit & Outdoors</h4>
            <p>
              Outdoor dining space, firepit for slow evenings, and outdoor
              shower.
            </p>
          </div>
        </div>
      </section>

      {/* GALLERY SECTION */}
      <section className="gallery-section" id="gallery">
        <div className="section-head">
          <div>
            <p className="section-kicker">Discover the beauty</p>
            <h2 className="section-title">Our Gallery</h2>
          </div>
          <p className="section-copy">
            Take a look around the farm grounds, air-conditioned rooms, outdoor
            pavilion, and 24-hour pool at Tresora.
          </p>
        </div>

        <div className="carousel-wrap">
          <div
            className="carousel-track"
            style={{
              transform: isMobile
                ? `translateX(calc(-${currentSlide} * (100% + 16px)))`
                : `translateX(calc(-${currentSlide} * ((100% - 32px) / 3 + 16px)))`,
            }}
          >
            {galleryImages.map((image) => (
              <button
                type="button"
                className="gallery-card"
                key={image.src}
                onClick={() => openLightbox(image)}
                aria-label="Open gallery image"
              >
                <img src={image.src} alt={image.alt} loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        <div className="carousel-controls">
          <div className="dots">
            {Array.from({ length: maxSlide + 1 }).map((_, index) => (
              <button
                key={index}
                className={`dot ${index === currentSlide ? "active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to gallery slide ${index + 1}`}
              />
            ))}
          </div>

          <div className="arrow-group">
            <button
              className="arrow-btn"
              disabled={currentSlide === 0}
              onClick={() => moveGallery(-1)}
              aria-label="Previous gallery image"
            >
              ←
            </button>
            <button
              className="arrow-btn"
              disabled={currentSlide === maxSlide}
              onClick={() => moveGallery(1)}
              aria-label="Next gallery image"
            >
              →
            </button>
          </div>
        </div>
      </section>

      {/* BOOKING & CALENDAR SECTION */}
      <section className="booking-section" id="booking">
        <div className="booking-inner">
          <div className="booking-intro">
            <p className="section-kicker">Your perfect getaway awaits</p>
            <h2 className="section-title">Reserve Your Stay</h2>
            <p>
              Standard stays are up to 22 hours (1:00 PM check-in, 11:00 AM
              check-out). Select your stay on the availability calendar, attach
              your QRPH deposit receipt, and submit your request.
            </p>

            {/* LIVE CALENDAR */}
            <div className="calendar-card">
              <div className="calendar-header">
                <h3>
                  {monthName} {year}
                </h3>
                <div className="arrow-group">
                  <button
                    type="button"
                    className="cal-nav-btn"
                    onClick={() => changeMonth(-1)}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="cal-nav-btn"
                    onClick={() => changeMonth(1)}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="calendar-weekdays">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="calendar-grid">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="cal-day empty" />
                ))}

                {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                  const day = idx + 1;
                  const dateStr = formatDateStr(year, month, day);
                  const booked = isDateBooked(dateStr);
                  const isPast = dateStr < todayStr;
                  const isCheckIn = formData.checkIn === dateStr;
                  const isCheckOut = formData.checkOut === dateStr;
                  const isInRange =
                    formData.checkIn &&
                    formData.checkOut &&
                    dateStr > formData.checkIn &&
                    dateStr < formData.checkOut;

                  let classNames = "cal-day";
                  if (isPast) classNames += " past";
                  else if (booked) classNames += " booked";
                  else classNames += " available";

                  if (isCheckIn || isCheckOut) classNames += " selected";
                  if (isInRange) classNames += " in-range";

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={classNames}
                      disabled={booked || isPast}
                      onClick={() => handleCalendarDayClick(dateStr)}
                      title={
                        booked
                          ? "Already Booked"
                          : isPast
                            ? "Past Date"
                            : "Click to select date"
                      }
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot avail" /> Available
                </div>
                <div className="legend-item">
                  <span className="legend-dot booked" /> Booked
                </div>
                <div className="legend-item">
                  <span className="legend-dot selected" /> Selected
                </div>
              </div>
            </div>

            <div className="experience-list">
              <div className="experience">
                <strong>24-Hour Infinity Pool</strong>
                <span>Private 3ft-5ft outdoor pool</span>
              </div>
              <div className="experience">
                <strong>On-Site Caretaker</strong>
                <span>Assistance throughout stay</span>
              </div>
              <div className="experience">
                <strong>Near Local Spots</strong>
                <span>Minutes from Daranak Falls</span>
              </div>
              <div className="experience">
                <strong>Free Parking</strong>
                <span>On-premises parking included</span>
              </div>
            </div>
          </div>

          <div className="booking-card">
            <h2>Guest Information</h2>
            <p className="booking-card-subtitle">
              Base rates cover up to 18 guests. Additional rates apply for
              groups up to 34.
            </p>

            {status.success && (
              <div className="success">
                Reservation request submitted. We'll confirm your booking
                shortly.
              </div>
            )}

            {status.error && <div className="error">{status.error}</div>}

            <form onSubmit={handleSubmit} className="booking-form">
              <div className="field-grid">
                <div className="field">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="field full">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label>Check-in | 1:00 PM | *</label>
                  <input
                    type="date"
                    name="checkIn"
                    required
                    min={todayStr}
                    value={formData.checkIn}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label>Check-out | 11:00 AM | *</label>
                  <input
                    type="date"
                    name="checkOut"
                    required
                    min={formData.checkIn || todayStr}
                    value={formData.checkOut}
                    onChange={handleChange}
                  />
                </div>

                <div className="field full">
                  <label>Number of Guests (Max 34) *</label>
                  <input
                    type="number"
                    name="guests"
                    min="1"
                    max="34"
                    required
                    value={formData.guests}
                    onChange={handleChange}
                  />
                  <span
                    style={{
                      fontSize: ".68rem",
                      color: "var(--muted)",
                      marginTop: "2px",
                    }}
                  >
                    * Standard rate covers up to 18 guests. Different rate
                    applies beyond 18 guests.
                  </span>
                </div>
              </div>

              <div className="payment-box">
                <div className="qr-wrapper">
                  <img className="qr" src="/qrph.png" alt="QRPH payment code" />
                </div>

                <div>
                  <h3>Payment via QRPH</h3>
                  <p>
                    Scan the QR code using GCash, Maya, ShopeePay, or bank app
                    to pay the deposit.
                  </p>

                  <div className="field" style={{ marginBottom: ".5rem" }}>
                    <label>QRPH Reference Number *</label>
                    <input
                      type="text"
                      name="referenceNumber"
                      required
                      value={formData.referenceNumber}
                      onChange={handleChange}
                      placeholder="e.g. 100293847561"
                    />
                  </div>

                  <div className="field">
                    <label>Attach Payment Receipt *</label>
                    <label
                      htmlFor="receipt-upload"
                      className="file-upload-label"
                    >
                      📎 Upload Receipt (Image/PDF)
                    </label>
                    <input
                      id="receipt-upload"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleChange}
                      style={{ display: "none" }}
                    />
                    {formData.receiptFile ? (
                      <span className="file-name-preview">
                        ✓ Selected: {formData.receiptFile.name}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: ".7rem",
                          color: "#8b3e28",
                          marginTop: ".25rem",
                        }}
                      >
                        * Receipt attachment is required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="submit-btn"
                type="submit"
                disabled={status.loading}
              >
                {status.loading ? "Submitting..." : "Complete Booking →"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* LIGHTBOX */}
      {activeImage && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
        >
          <button
            className="close"
            type="button"
            onClick={() => setActiveImage(null)}
            aria-label="Close gallery"
          >
            ×
          </button>

          <button
            className="light-nav prev"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const i = galleryImages.findIndex(
                (x) => x.src === activeImage.src,
              );
              setActiveImage(
                galleryImages[
                  (i - 1 + galleryImages.length) % galleryImages.length
                ],
              );
            }}
            aria-label="Previous image"
          >
            ‹
          </button>

          <img
            src={activeImage.src}
            alt={activeImage.alt}
            onClick={(e) => e.stopPropagation()}
          />

          <button
            className="light-nav next"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const i = galleryImages.findIndex(
                (x) => x.src === activeImage.src,
              );
              setActiveImage(galleryImages[(i + 1) % galleryImages.length]);
            }}
            aria-label="Next image"
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
}
