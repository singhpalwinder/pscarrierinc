import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/apiClient";
import { AuthContext } from "../../context/AuthContext";
import "./TripSheet.css"

const TripSheet = () => {
  const { isAuthenticated, isAdmin } = useContext(AuthContext);
  const navigate = useNavigate();
  
    useEffect(() => {
          document.title = "Driver Trip Sheet";
      }, []);
  
  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate("/");
    }
  }, [isAuthenticated, isAdmin, navigate])
    const [tripRows, setTripRows] = useState(() => {
        const count = parseInt(sessionStorage.getItem("tripInputCount") || "1");
        return Array.from({ length: count }, (_, i) => i + 1);
    });

  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("tripFormData");
    return saved ? JSON.parse(saved) : {};
  });
  const [payStub, setPayStub] = useState("");

  useEffect(() => {
    sessionStorage.setItem("tripFormData", JSON.stringify(formData));
  }, [formData]);

  useEffect(() => {
    sessionStorage.setItem("tripInputCount", tripRows.length);
  }, [tripRows]);

const handleChange = (e) => {
  const id = e.target.id;
  let value = e.target.value;

  if (id.includes("-state")) {
    value = formatWords("state", value);
  } else if (id.includes("-city")) {
    value = formatWords("city", value);
  } else if (id.includes("mileage")) {
    value = formatNumbersOnly(value)
  } else if (id === "extra-payment-value" || id === "advance-given-value") {
    value = unformatCurrency(value);

    // limit to one decimal
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }
  }
  else if (id === "cents-per-mile") {
  value = normalizeCentsPerMile(value);
  }
  else if (id === "trip-number") {
    value = formatNumbersOnly(value);
  }
  else if (id === "driver-name") {
    value = formatWords("name", value)
  }

  const updated = { ...formData, [id]: value };
  setFormData(updated);
  calculatePayStub(updated);
};
  // format currency and mileage 
  const formatCentsPerMile = (value) => {
    if (!value) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    return `$${num.toFixed(2)}`;
  };

  const normalizeCentsPerMile = (value) => {
    const digits = value.replace(/[^0-9]/g, ""); // strip everything but digits
    if (!digits) return "";

    // Convert cents (string of digits) to dollar float
    const floatVal = (parseInt(digits, 10) / 100).toFixed(2);
    return floatVal;
  };
    const formatCurrency = (value) => {
    if (!value) return "";

    return `$${value}`;
  }
  const unformatCurrency = (val) => {
  return val.replace(/[^0-9.]/g, "");
};
  const formatNumbersOnly = (value) => {
    if (!value) return "";
    // Remove all non-digit characters
    const numeric = value.replace(/\D/g, "");

    // If the result is empty, return empty string
    if (!numeric) return "";

    return `${numeric}`;
  };
  const formatWords = (type, value) => {
    if (!value) return "";

    if (type === "state") {
      return value.toUpperCase();
    }

    if (type === "city" || type === "name") {
      return value
        .toLowerCase()
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }

    return value;
  };

  const addRow = () => {
    setTripRows([...tripRows, tripRows.length + 1]);
  };

const calculateTotalMiles = (data) => {
  return tripRows.reduce((sum, i) => {
    const val = parseInt(data[`mileage${i}`], 10);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
};

  const calculatePayStub = (data) => {
    const totalMiles = calculateTotalMiles(data);
    const centsPerMile = parseFloat(data["cents-per-mile"]);
    const extraPaymentReason = data["reason"];
    const extraPayment = parseFloat(data["extra-payment-value"]);
    const advanceGiven = parseFloat(data["advance-given-value"]);
    const advanceGivenReason = String(data["advance-given-reason"]);

    if (isNaN(centsPerMile)) {
      setPayStub("");
      return;
    }

    const milesPay = totalMiles * centsPerMile;
    const totalPay = milesPay + (isNaN(extraPayment) ? 0 : extraPayment) -  (isNaN(advanceGiven) ? 0 : advanceGiven);

    let stub = `${totalMiles} mi x $${centsPerMile.toFixed(2)} = $${milesPay.toFixed(2)}<br>`;

    if (extraPayment > 0) {
      stub += `+ ${extraPaymentReason} = $${extraPayment.toFixed(2)}<br>`;
    }

    if (advanceGiven > 0) {
      stub += `- ${advanceGivenReason} = $${advanceGiven.toFixed(2)}<br>`;
    }

    stub += `Total Pay = <strong>$${totalPay.toFixed(2)}</strong>`;

    setPayStub(stub);

  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trips = tripRows.map(i => ({
      src: {
        city: formData[`src${i}-city`] || "",
        state: formData[`src${i}-state`] || ""
      },
      dst: {
        city: formData[`dst${i}-city`] || "",
        state: formData[`dst${i}-state`] || ""
      },
      miles: formData[`mileage${i}`] || ""
    })).filter(trip => trip.src.city || trip.dst.city);

    const formatDate = (isoDateStr) => {
      if (!isoDateStr) return '';
      const [yyyy, mm, dd] = isoDateStr.split('-');
      return `${mm}/${dd}/${yyyy}`;
    };

    try {
      const response = await apiFetch("/tripSheets", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_number: formData["trip-number"],
          driver_name: formData["driver-name"],
          extra_payment: formData["extra-payment-value"],
          extra_reason: formData["reason"],
          advance_given_reason: formData["advance-given-reason"],
          advance_given_value: formData["advance-given-value"],
          cents_per_mile: formData["cents-per-mile"],
          trip_date_start: formatDate(formData["trip-date-start"]),
          trip_date_end: formatDate(formData["trip-date-end"]),
          trips
        })
      });

      if (!response.ok) throw new Error("Server error");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'trip_sheet.pdf';
      link.click();
      URL.revokeObjectURL(url);

      sessionStorage.removeItem("tripFormData");
      sessionStorage.removeItem("tripInputCount");
    } catch (err) {
      alert("Error submitting trip data");
      console.error(err);
    }
  };

    return (
    <form onSubmit={handleSubmit}>
      <table className="trip-info">
        <thead>
            <tr>
              <th>
                <p>Driver Trip Sheet</p>
              </th>
            </tr>
        </thead>
        <tbody>
            <tr>
              <td>
                 <label htmlFor="driver-name">Driver Name</label>
                <input id="driver-name" value={formData["driver-name"] || ""} onChange={handleChange} />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="cents-per-mile">Cents/Mile</label>
                <input id="cents-per-mile" value={formatCentsPerMile(formData["cents-per-mile"]) || ""} onChange={handleChange} />
              </td>
            </tr>
            <tr>
              <td>
                <label htmlFor="trip-number">Trip #</label>
                <input id="trip-number" value={formData["trip-number"] || ""} onChange={handleChange} />
              </td>
            </tr>
            <tr>
              <td className="trip-dates">
                <label htmlFor="trip-start-date">Trip Date Start</label>
                <input type="date" id="trip-date-start" value={formData["trip-date-start"] || ""} onChange={handleChange} />
                <label htmlFor="trip-end-date">Trip Date End</label>
                <input type="date" id="trip-date-end" value={formData["trip-date-end"] || ""} onChange={handleChange} />
              </td>
            </tr>
        </tbody>
      </table>

      <table className="trips">
        <thead>
            <tr>
              <th>From</th>
              <th>To</th>
              <th colSpan="2">Miles</th>
            </tr>
        </thead>
        <tbody>
          {tripRows.map(i => (
            <tr key={i}>
              <td>
                <label>City</label>
                <input id={`src${i}-city`} value={formData[`src${i}-city`] || ""} onChange={handleChange} />
                <label>State</label>
                <input id={`src${i}-state`} value={formData[`src${i}-state`] || ""} onChange={handleChange} />
              </td>
              <td>
                <label>City</label>
                <input id={`dst${i}-city`} value={formData[`dst${i}-city`] || ""} onChange={handleChange} />
                <label>State</label>
                <input id={`dst${i}-state`} value={formData[`dst${i}-state`] || ""} onChange={handleChange} />
              </td>
              <td>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  width: "100%"
                }}>
                  <input
                    id={`mileage${i}`}
                    value={formData[`mileage${i}`] || ""}
                    onChange={handleChange}
                    style={{ width: "60px", textAlign: "center" }}
                  />
                  <span style={{ whiteSpace: "nowrap" }}>mi</span>
                </div>
              </td>
              <td>
                {i === tripRows.length && <button type="button" onClick={addRow}>+</button>}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2"><h4>Total Miles:</h4></td>
            <td colSpan="2"><h4>{calculateTotalMiles(formData)}</h4></td>
          </tr>
        </tfoot>
        </table>

        <table className="extras">
          <tbody>
            <tr>
              <td>
              <label>Advance Reason</label>
              <input id="advance-given-reason" value={formData["advance-given-reason"] || ""} onChange={handleChange}/>
              <label>Advance Amount</label>
              <input id="advance-given-value" value={formatCurrency(formData["advance-given-value"]) || ""} onChange={handleChange}/>
              </td>
              <td>
          <label>Extras Reason</label>
          <input id="reason" value={formData["reason"] || ""} onChange={handleChange} />
          <label>Added Amount</label>
          <input id="extra-payment-value" value={formatCurrency(formData["extra-payment-value"]) || ""} onChange={handleChange} />
              </td>
            </tr>
          </tbody>
        </table>
      <div>
        <button style={{marginTop: "10px"}} type="submit">Submit</button>
      </div>

      {payStub ? (
  <div style={{ display: "flex", justifyContent: "center", marginTop: "30px" }}>
    <div
      style={{
        textAlign: "right",
        lineHeight: "1.6",
        fontSize: "1.1em",
        fontFamily: "monospace",
        paddingTop: "10px",
      }}
      dangerouslySetInnerHTML={{ __html: payStub }}
    />
  </div>
) : null}
    </form>
  );
};

export default TripSheet;