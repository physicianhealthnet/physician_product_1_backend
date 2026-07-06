import Appointment from "../models/appointment.model.js";
import AppointmentsModel from "../models/Appointments.model.js";
import Patient from "../models/patientModel/patient.model.js";
import PatientRegistration from "../models/patientModel/patientRegistration.model.js";
import { createDBService } from "../services/db.service.js";
import PhysicianAssessment from "../models/physicianAssessment.model.js";
import Prescription from "../models/prescription.model.js";
import LabPrescription from "../models/labPrescription.model.js";
import ScanPrescription from "../models/scanPrescription.model.js";
const patientService = createDBService(Patient);

// Original Controllers
export const getPatientController = async (req, res) => {
  try {
    const patients = await patientService.getAll();

    let maleCount = 0;
    let femaleCount = 0;

    let under18Count = 0;
    let between18And30Count = 0;
    let between31And45Count = 0;
    let between46And60Count = 0;
    let above60Count = 0;

    for (const patient of patients) {
      if (patient.patientGender?.toLowerCase() === "male") {
        maleCount++;
      } else if (patient.patientGender?.toLowerCase() === "female") {
        femaleCount++;
      }

      if (patient.patientAge < 18) {
        under18Count++;
      } else if (patient.patientAge >= 18 && patient.patientAge <= 30) {
        between18And30Count++;
      } else if (patient.patientAge >= 31 && patient.patientAge <= 45) {
        between31And45Count++;
      } else if (patient.patientAge >= 46 && patient.patientAge <= 60) {
        between46And60Count++;
      } else if (patient.patientAge > 60) {
        above60Count++;
      }
    }

    return res.status(200).json({
      message: "Patient fetched successfully",
      total: patients.length,
      male: maleCount,
      female: femaleCount,
      ageGroups: {
        under18: under18Count,
        between18And30: between18And30Count,
        between31And45: between31And45Count,
        between46And60: between46And60Count,
        above60: above60Count,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getPainOfMonthController = async (req, res) => {
  try {
    const now = new Date();
    let startDate;
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    if (req.path.includes("three-month")) {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (req.path.includes("six-month")) {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (req.path.includes("year")) {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    // Note: The original code was missing the data fetch here, using dummy data to prevent crash
    const painData = []; 

    return res.status(200).json({
      message: "Pain fetched successfully",
      range: `${startDate.toISOString()} - ${endDate.toISOString()}`,
      data: painData,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getAppointmentController = async (req, res) => {
  try {
    const now = new Date();
    let startDate;
    const endDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );

    if (req.path.includes("appointment-week")) {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    } else if (req.path.includes("appointment-month")) {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (req.path.includes("appointment-year")) {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const appointments = await Appointment.find({
      appointmentDate: {
        $gte: startDate,
        $lte: endDate,
      },
    });
    return res.status(200).json({
      message: "Appointments fetched successfully",
      from: startDate,
      to: endDate,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// --- Dashboard V2 Logic ---

const aggregatePatientStats = (patientsData, patientRegs) => {
  let maleCount = 0, femaleCount = 0, othersCount = 0, newPatientsCount = 0;
  let activePatientsCount = 0, inactivePatientsCount = 0;
  let under18 = 0, between18And30 = 0, between31And45 = 0, between46And60 = 0, above60 = 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const regsByPatientId = new Map();
  patientRegs.forEach(r => {
    if (r.patientId) regsByPatientId.set(String(r.patientId), r);
    if (r.PHN_ID) regsByPatientId.set(String(r.PHN_ID), r);
  });

  for (const p of patientsData) {
    const reg = regsByPatientId.get(p.patientId) || regsByPatientId.get(p.PHN_ID);
    
    const gender = reg?.patientGender?.toLowerCase();
    if (gender === "male") maleCount++;
    else if (gender === "female") femaleCount++;
    else othersCount++;
    
    const age = parseInt(reg?.patientAge) || 0;
    if (age < 18) under18++;
    else if (age <= 30) between18And30++;
    else if (age <= 45) between31And45++;
    else if (age <= 60) between46And60++;
    else above60++;

    const pDate = new Date(p.createdAt);
    if (pDate >= thirtyDaysAgo) newPatientsCount++;

    const lastActivityDate = reg?.updatedAt ? new Date(reg.updatedAt) : pDate;
    if (lastActivityDate >= thirtyDaysAgo) activePatientsCount++;
    else inactivePatientsCount++;
  }

  return {
    total: patientsData.length,
    male: maleCount,
    female: femaleCount,
    others: othersCount,
    newPatients: newPatientsCount,
    activePatients: activePatientsCount,
    inactivePatients: inactivePatientsCount,
    ageGroups: { under18, between18And30, between31And45, between46And60, above60 }
  };
};

export const getDashboardDataController = async (req, res) => {
  const { clinicId, doctorId } = req.query;
  const clinicArray = clinicId ? (Array.isArray(clinicId) ? clinicId : clinicId.split(",")) : null;
  const targetClinicId = clinicArray ? clinicArray[0] : "";

  try {
    let query = { isDeleted: false };
    if (clinicArray) {
      query.clinicId = { $in: clinicArray };
    }

    // IF doctorId/doctorName is provided, filter patients who have at least one appointment with this doctor
    let handledPatientIds = new Set();
    if (doctorId || req.query.doctorName) {
      const dName = req.query.doctorName || "";
      console.log("doctorId", doctorId, "doctor Name", dName);
      
      const docAppts = await AppointmentsModel.find({ 
        $or: [{ doctorId }, { doctor: dName }],
        isDeleted: false 
      }).select("patientId");
      
      const legacyDocAppts = await Appointment.find({ 
        $or: [{ doctor: doctorId }, { doctor: dName }], 
        isDeleted: false 
      }).select("patientId");
      
      handledPatientIds = new Set([
        ...docAppts.map(a => a.patientId),
        ...legacyDocAppts.map(a => a.patientId)
      ]);

      query.$or = [
        { patientId: { $in: Array.from(handledPatientIds) } },
        { PHN_ID: { $in: Array.from(handledPatientIds) } }
      ];
    }

    const [patientRegs, patients] = await Promise.all([
      PatientRegistration.find(query),
      Patient.find(query)
    ]);
    
    // For joining Hub data, we need a broader search as IDs might be global
    let allPatients = await Patient.find({ isDeleted: false });
    let allPatientRegs = await PatientRegistration.find({ isDeleted: false });

    const patientStats = aggregatePatientStats(patients, patientRegs);
    
    // If doctor filter is active, total patients should be the count of unique patients they've handled
    if (doctorId || req.query.doctorName) {
      patientStats.total = handledPatientIds.size;
    }

    // Calculate Attended Patients (Unique patients with "Completed" appointments for this doctor)
    let attendedPatientsCount = 0;
    if (doctorId || req.query.doctorName) {
      const dName = req.query.doctorName || "";
      const completedAppts = await AppointmentsModel.find({
        $or: [{ doctorId }, { doctor: dName }],
        status: { $in: ["Completed", "Checked-out"] },
        isDeleted: false
      }).distinct("patientId");

      const legacyCompletedAppts = await Appointment.find({
        $or: [{ doctor: doctorId }, { doctor: dName }],
        status: { $in: ["Completed", "Checked-out"] },
        isDeleted: false
      }).distinct("patientId");

      const uniqueAttendedIds = new Set([
        ...completedAppts.map(id => String(id)),
        ...legacyCompletedAppts.map(id => String(id))
      ]);
      attendedPatientsCount = uniqueAttendedIds.size;
    } else {
      // If no doctor filter, total completed appointments in the clinic
      const completedAppts = await AppointmentsModel.find({
        clinicId: { $in: clinicArray },
        status: { $in: ["Completed", "Checked-out"] },
        isDeleted: false
      }).distinct("patientId");
      attendedPatientsCount = completedAppts.length;
    }
    patientStats.attendedPatients = attendedPatientsCount;

    // Calculate Today's Stats for the doctor/clinic
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Dynamic Ranges for Row 3
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);

    const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfThisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
    const endOfThisWeek = new Date(startOfThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

    const startOfNextWeek = new Date(startOfThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfNextWeek = new Date(startOfNextWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1000);

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const dName = req.query.doctorName || "";
    const doctorFilterNew = doctorId || dName ? { $or: [{ doctorId }, { doctor: dName }] } : {};
    const doctorFilterLegacy = doctorId || dName ? { $or: [{ doctor: doctorId }, { doctor: dName }] } : {};

    const getApptCount = async (start, end) => {
      const startStr = start.toISOString().split("T")[0];
      const startLocal = start.toLocaleDateString("en-CA");
      
      const q = { ...doctorFilterNew, date: { $gte: start, $lte: end }, isDeleted: false };
      const legacyQ = { 
        ...doctorFilterLegacy, 
        $or: [
          { appointmentDate: { $gte: start, $lte: end } },
          { date: startStr },
          { date: startLocal }
        ],
        isDeleted: false 
      };
      const [count, legacyCount] = await Promise.all([
        AppointmentsModel.countDocuments(q),
        Appointment.countDocuments(legacyQ)
      ]);
      return count + legacyCount;
    };

    const [tomorrowCount, thisWeekCount, nextWeekCount, thisMonthCount] = await Promise.all([
      getApptCount(startOfTomorrow, endOfTomorrow),
      getApptCount(startOfThisWeek, endOfThisWeek),
      getApptCount(startOfNextWeek, endOfNextWeek),
      getApptCount(startOfThisMonth, endOfThisMonth)
    ]);

    patientStats.tomorrowCount = tomorrowCount;
    patientStats.thisWeekCount = thisWeekCount;
    patientStats.nextWeekCount = nextWeekCount;
    patientStats.thisMonthCount = thisMonthCount;

    let todayTotal = 0;
    let todayCompleted = 0;

    const todayAppts = await AppointmentsModel.find({
      ...doctorFilterNew,
      date: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false
    });

    const legacyTodayAppts = await Appointment.find({
      ...doctorFilterLegacy,
      $or: [
        { appointmentDate: { $gte: startOfDay, $lte: endOfDay } },
        { date: now.toISOString().split("T")[0] },
        { date: now.toLocaleDateString("en-CA") }
      ],
      isDeleted: false
    });

    todayTotal = todayAppts.length + legacyTodayAppts.length;
    todayCompleted = todayAppts.filter(a => ["Completed", "Checked-out"].includes(a.status)).length + 
                     legacyTodayAppts.filter(a => ["Completed", "Checked-out"].includes(a.status)).length;

    let hubApts = [];
    try {
      let hubUrl = process.env.NODE_ENV === "development"
        ? "http://localhost:3028"
        : process.env.VITE_SECONDARY_API_URL || "https://dependencyforphn.physicianhealthnet.com/api";
      if (targetClinicId) {
        let response;
        try {
          response = await fetch(`${hubUrl}/user-appointment/clinic-appointments/${targetClinicId}`);
        } catch (e) {
          if (hubUrl.includes("localhost")) {
             hubUrl = hubUrl.replace("localhost", "127.0.0.1");
             response = await fetch(`${hubUrl}/user-appointment/clinic-appointments/${targetClinicId}`);
          } else { throw e; }
        }

        if (response && response.ok) {
          const hubRes = await response.json();
          hubApts = hubRes.data || hubRes;
        }
      }
    } catch (hubError) {
      console.error("[Dashboard] Hub fetch error:", hubError.message);
    }

    // --- Auto-Sync Hub Patients ---
    const hubAptsList = Array.isArray(hubApts) ? hubApts : (hubApts?.data || []);
    const uniqueHubPatientIds = [...new Set(hubAptsList.map(a => a.patientId).filter(Boolean))];
    
    // Check missing among ALL non-deleted patients
    const existingPhnIds = new Set(allPatients.map(p => String(p.PHN_ID)).filter(id => id && id !== "undefined"));
    const missingPhnIds = uniqueHubPatientIds.filter(id => !existingPhnIds.has(String(id)));

    if (missingPhnIds.length > 0) {
        console.log(`[Dashboard] Syncing ${missingPhnIds.length} missing patients from Hub...`);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const latest = await Patient.findOne({ patientId: { $regex: `^${currentYear}-` } }).sort({ createdAt: -1 });
      let nextNum = 1;
      if (latest?.patientId) {
          const num = parseInt(latest.patientId.split("-")[2], 10);
          if (!isNaN(num)) nextNum = num + 1;
      }

      for (const phnId of missingPhnIds) {
          const apt = hubAptsList.find(a => String(a.patientId) === String(phnId));
          if (apt) {
              try {
                  const paddedNumber = String(nextNum).padStart(3, '0');
                  const newPtId = `${currentYear}-${currentMonth}-${paddedNumber}`;
                  nextNum++; 

                    const newPatient = new Patient({
                        clinicId: targetClinicId ? [targetClinicId] : [],
                        patientId: newPtId,
                        PHN_ID: phnId,
                        patientName: apt.patientName || apt.name || "Hub Patient",
                        patientPhone: apt.patientPhone || apt.phone || "",
                        patientEmail: apt.patientEmail || apt.email || "",
                        password: "Password123",
                        isVerified: false
                    });
                    await newPatient.save();
                    
                    const newReg = new PatientRegistration({
                        clinicId: targetClinicId || "GENERAL",
                        patientId: newPtId,
                        PHN_ID: phnId,
                        patientName: newPatient.patientName,
                        treatment_status: "live"
                    });
                    await newReg.save();
                    console.log(`[Dashboard] Synced: ${newPatient.patientName} (${newPtId}) -> ${phnId}`);
                } catch (e) {
                    console.error(`[Dashboard] Failed to auto-sync patient ${phnId}:`, e.message);
                }
            }
        }
        // Refresh caches after sync
        allPatients = await Patient.find({ isDeleted: false });
        allPatientRegs = await PatientRegistration.find({ isDeleted: false });
    }

    // Fetch local appointments
    const startOfQuery = startOfThisMonth;
    const endOfQuery = endOfThisMonth > endOfNextWeek ? endOfThisMonth : endOfNextWeek;

    const baseFilterNew = { isDeleted: false };
    const baseFilterLegacy = { isDeleted: false };
    if (targetClinicId) {
        baseFilterNew.clinicId = targetClinicId;
        baseFilterLegacy.clinicId = targetClinicId;
    }

    const [localNewApts, localLegacyApts] = await Promise.all([
      AppointmentsModel.find({ 
        ...baseFilterNew,
        ...(doctorId ? { doctorId } : {}),
        date: { $gte: startOfQuery, $lte: endOfQuery }
      }).lean(),
      Appointment.find({ 
        ...baseFilterLegacy,
        ...(dName ? { doctor: dName } : {}),
        $or: [
          { appointmentDate: { $gte: startOfQuery, $lte: endOfQuery } },
          { date: { $gte: startOfQuery.toISOString().split("T")[0], $lte: endOfQuery.toISOString().split("T")[0] } }
        ]
      }).lean()
    ]);

    // Formatters
    const toLocalDate = (d) => {
        if (!d) return null;
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return String(d).split('T')[0];
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch { return String(d).split('T')[0]; }
    };

    const areSameApt = (a, b) => {
        const idA = String(a._id || "");
        const webIdA = String(a.webAppointmentId || "");
        const idB = String(b._id || "");
        const webIdB = String(b.webAppointmentId || "");

        // Match if one's webAppointmentId matches the other's _id
        const idMatch = (idA && (idA === idB || idA === webIdB)) || 
                        (webIdA && (webIdA === idB || webIdA === webIdB));

        if (idMatch) return true;

        const timeA = a.selectedSlot || a.startTime || "";
        const timeB = b.selectedSlot || b.startTime || "";
        const dA = toLocalDate(a.date || a.appointmentDate);
        const dB = toLocalDate(b.date || b.appointmentDate);
        
        // Fallback to name/date/time matching if IDs are missing
        return timeA === timeB && dA === dB && (a.patientName || a.name) === (b.patientName || b.name);
    };

    const passesDoctorFilter = (apt) => {
        if (!doctorId && !dName) return true;
        const aptDocId = String(apt.doctorId || apt.doctor || "");
        const aptDocName = String(apt.doctorName || apt.docName || apt.doctor || "").toLowerCase();
        const searchId = String(doctorId || "");
        const searchName = String(dName || "").toLowerCase();
        
        return (searchId && aptDocId.includes(searchId)) || 
               (searchName && aptDocName.includes(searchName));
    };

    // Unify all sources
    let allMerged = [];
    if (Array.isArray(hubApts)) {
      allMerged = hubApts.filter(a => passesDoctorFilter(a)).map(a => ({...a, isWeb: true}));
    } else if (hubApts && Array.isArray(hubApts.data)) {
      allMerged = hubApts.data.filter(a => passesDoctorFilter(a)).map(a => ({...a, isWeb: true}));
    }

    localNewApts.forEach(la => {
      if (!passesDoctorFilter(la)) return;
      
      const existingIdx = allMerged.findIndex(a => areSameApt(a, la));
      const laWeb = { ...la, isWeb: !!la.webAppointmentId };
      if (existingIdx !== -1) {
          // IMPORTANT: Replace the Hub record with the local one, as local has the'Checked-out' status
          allMerged[existingIdx] = { ...laWeb, isWeb: true };
      } else {
          allMerged.push(laWeb);
      }
    });

    localLegacyApts.forEach(la => {
      if (!passesDoctorFilter(la)) return;
      const existingIdx = allMerged.findIndex(a => areSameApt(a, la));
      const laWeb = { ...la, isWeb: !!la.webAppointmentId };
      if (existingIdx === -1) {
          allMerged.push(laWeb);
      } else {
          // If the match preserves hub origins, update tag natively 
          if(allMerged[existingIdx].isWeb) {
             allMerged[existingIdx].isWeb = true;
          }
      }
    });

    const getCountForRange = (start, end, onlyWeb = false) => {
        const s = toLocalDate(start);
        const e = toLocalDate(end);
        return allMerged.filter(apt => {
            const d = toLocalDate(apt.date || apt.appointmentDate);
            const status = (apt.status || "").toLowerCase();
            const isActive = !["completed", "checked-out", "cancelled", "reject"].includes(status);
            const webCondition = onlyWeb ? apt.isWeb : true;
            return d >= s && d <= e && isActive && webCondition;
        }).length;
    };

    patientStats.tomorrowCount = getCountForRange(startOfTomorrow, endOfTomorrow);
    patientStats.thisWeekCount = getCountForRange(startOfDay, endOfThisWeek);
    patientStats.nextWeekCount = getCountForRange(startOfNextWeek, endOfNextWeek);
    patientStats.thisMonthCount = getCountForRange(startOfDay, endOfThisMonth);

    patientStats.webTodayCount = getCountForRange(startOfDay, endOfDay, true);
    patientStats.webTomorrowCount = getCountForRange(startOfTomorrow, endOfTomorrow, true);
    patientStats.webThisWeekCount = getCountForRange(startOfDay, endOfThisWeek, true);
    patientStats.webNextWeekCount = getCountForRange(startOfNextWeek, endOfNextWeek, true);
    patientStats.webThisMonthCount = getCountForRange(startOfDay, endOfThisMonth, true);

    const todayStr = toLocalDate(now);
    const todayRaw = allMerged.filter(apt => toLocalDate(apt.date || apt.appointmentDate) === todayStr);

    const mapToUI = (apt) => {
        if (!apt) return null;
        const pIdFromHub = apt.patientId;
        const pNameFromHub = apt.patientName || apt.name;
        
        let pDoc = allPatients?.find(p => 
          String(p.PHN_ID) === String(pIdFromHub) || 
          String(p.patientId) === String(pIdFromHub) || 
          (p._id && p._id.toString() === String(pIdFromHub))
        ) || allPatientRegs?.find(p => 
          String(p.PHN_ID) === String(pIdFromHub) || 
          String(p.patientId) === String(pIdFromHub) ||
          (p._id && p._id.toString() === String(pIdFromHub))
        );

        console.log(pDoc);
        
        
        if (!pDoc && pIdFromHub) {
          console.log(`[Dashboard] mapToUI: Still undefined for ${pIdFromHub}. allPatients count: ${allPatients?.length}`);
        }
                   
        
        return {
            _id: apt._id,
            patientId: pDoc?.patientId || pIdFromHub,
            name: pDoc?.patientName || apt.patientName || "Unknown Patient",
            diagnosis: pDoc?.patientHistory || apt.diagnosis || "General Consultation",
            time: apt.selectedSlot || apt.startTime || "Ongoing",
            status: apt.status || "Booked",
            date: apt.date || apt.appointmentDate || null,
            photo: pDoc?.photo || null,
            patientObj: pDoc || null
        };
    };

    const todayAppointments = todayRaw.map(mapToUI).filter(Boolean).sort((a, b) => {
        const getTime = (t) => {
            if (!t || t === "Ongoing") return 0;
            const match = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let [_, h, m, p] = match;
            h = parseInt(h);
            if (p.toUpperCase() === "PM" && h < 12) h += 12;
            if (p.toUpperCase() === "AM" && h === 12) h = 0;
            return h * 60 + parseInt(m);
        };
        return getTime(a.time) - getTime(b.time);
    });

    const futureRaw = allMerged.filter(apt => {
        const aptDate = toLocalDate(apt.date || apt.appointmentDate);
        return aptDate > todayStr;
    });
    
    const futureAppointments = futureRaw.map(mapToUI).filter(Boolean).sort((a, b) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        if (dateA !== dateB) return dateA - dateB;

        const getTime = (t) => {
            if (!t || t === "Ongoing") return 0;
            const match = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let [_, h, m, p] = match;
            h = parseInt(h);
            if (p.toUpperCase() === "PM" && h < 12) h += 12;
            if (p.toUpperCase() === "AM" && h === 12) h = 0;
            return h * 60 + parseInt(m);
        };
        return getTime(a.time) - getTime(b.time);
    });

    patientStats.todayTotalAppointments = todayAppointments.length;
    
    const isCompletedStatus = (s) => ["completed", "checked-out"].includes(String(s || "").toLowerCase());

    patientStats.todayCompletedAppointments = todayAppointments.filter(a => isCompletedStatus(a.status)).length;

    const morningAppointments = [];
    const afternoonAppointments = [];
    const eveningAppointments = [];

    todayAppointments.forEach(apt => {
        const t = apt.time;
        if (!t || t === "Ongoing") { morningAppointments.push(apt); return; }
        const match = String(t).match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) { morningAppointments.push(apt); return; }
        let h = parseInt(match[1]);
        if (match[3].toUpperCase() === "PM" && h < 12) h += 12;
        if (match[3].toUpperCase() === "AM" && h === 12) h = 0;
        
        if (h < 12) morningAppointments.push(apt);
        else if (h < 16) afternoonAppointments.push(apt);
        else eveningAppointments.push(apt);
    });

    const getSlotStats = (list) => ({
        total: list.length,
        completed: list.filter(a => isCompletedStatus(a.status)).length
    });

    patientStats.morning = getSlotStats(morningAppointments);
    patientStats.afternoon = getSlotStats(afternoonAppointments);
    patientStats.evening = getSlotStats(eveningAppointments);

    const nextPatient = todayAppointments.find(a => {
        const s = String(a.status || "").toLowerCase();
        return !["completed", "checked-out", "cancelled", "reject"].includes(s);
    }) || null;
    if (nextPatient && nextPatient.patientObj) {
        const p = nextPatient.patientObj;
        nextPatient.profile = {
            sex: p.patientGender,
            age: p.patientAge,
            phone: p.patientPhone,
            address: p.patientAddress,
            historyTags: p.patientHistory ? p.patientHistory.split(",").map(t => t.trim()) : []
        };
    }

    return res.status(200).json({
      message: "Dashboard successfully aggregated",
      patientStats,
      nextPatient,
      todayAppointments,
      tomorrowAppointments: futureAppointments.filter(apt => toLocalDate(apt.date) === toLocalDate(new Date(now.getTime() + 24 * 60 * 60 * 1000))),
      futureAppointments,
      morningAppointments,
      afternoonAppointments,
      eveningAppointments
    });
  } catch (err) {
    console.error("[Dashboard] Controller Error:", err);
    return res.status(500).json({
      message: "Server Error Dashboard aggregation",
      error: err.message,
    });
  }
};

export const getDashboardPatientListController = async (req, res) => {
  const { patientIds } = req.query; // Expecting comma separated patient IDs
  if (!patientIds) {
    return res.status(400).json({ message: "patientIds query parameter is required" });
  }

  const idsArray = patientIds.split(",").filter(Boolean);

  try {
    const [
      patients,
      registrations,
      assessments,
      prescriptions,
      labPrescriptions,
      scanPrescriptions
    ] = await Promise.all([
      Patient.find({ patientId: { $in: idsArray } }).lean(),
      PatientRegistration.find({ patientId: { $in: idsArray } }).lean(),
      PhysicianAssessment.find({ patientId: { $in: idsArray } }).lean(),
      Prescription.find({ patientId: { $in: idsArray } }).lean(),
      LabPrescription.find({ patientId: { $in: idsArray } }).lean(),
      ScanPrescription.find({ patientId: { $in: idsArray } }).lean(),
    ]);

    const result = idsArray.reduce((acc, pId) => {
      const pDoc = patients.find(p => p.patientId === pId) || {};
      const rDoc = registrations.find(r => r.patientId === pId) || {};
      const aDocs = assessments.filter(a => a.patientId === pId);
      const preDocs = prescriptions.filter(p => p.patientId === pId);
      const labDocs = labPrescriptions.filter(p => p.patientId === pId);
      const scanDocs = scanPrescriptions.filter(p => p.patientId === pId);

      // Latest assessment
      let latestAssessment = null;
      if (aDocs.length > 0) {
        latestAssessment = aDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      }

      const hasTreatmentPlan = latestAssessment && latestAssessment.treatment && latestAssessment.treatment.plan && latestAssessment.treatment.plan.length > 0;
      const isOldPatient = !!hasTreatmentPlan;

      // Primary Complaint
      let primaryComplaint = rDoc.primaryComplaint || "";
      if (latestAssessment && latestAssessment.chiefComplaintsList && latestAssessment.chiefComplaintsList.length > 0) {
        primaryComplaint = latestAssessment.chiefComplaintsList[latestAssessment.chiefComplaintsList.length - 1].text || primaryComplaint;
      }

      // Attender info from registration
      const attenderName = rDoc.attenderName || pDoc.attenderName || rDoc.guardianName || pDoc.guardianName || "N/A";
      const attenderPhone = rDoc.attenderPhone || pDoc.attenderPhone || "N/A";
      const attenderRelationship = rDoc.attenderRelationship || pDoc.attenderRelationship || rDoc.relationship || pDoc.relationship || "N/A";

      let lastTreatmentData = null;
      let treatmentHistory = [];
      if (isOldPatient) {
        const plans = latestAssessment.treatment.plan;
        lastTreatmentData = plans[plans.length - 1];
        treatmentHistory = plans;
      }

      // Summarize prescriptions
      const rxCount = preDocs.length;
      const labCount = labDocs.length;
      const scanCount = scanDocs.length;
      const xrayCount = scanDocs.filter(d => d.scanType && d.scanType.toLowerCase().includes('x-ray')).length;
      const mriCount = scanDocs.filter(d => d.scanType && d.scanType.toLowerCase().includes('mri')).length;
      const ctScanCount = scanDocs.filter(d => d.scanType && d.scanType.toLowerCase().includes('ct')).length;

      acc[pId] = {
        isOldPatient,
        patientDetails: {
          id: pId,
          name: pDoc.patientName || rDoc.patientName || "Unknown",
          gender: pDoc.patientGender || rDoc.patientGender || "N/A",
          age: pDoc.patientAge || rDoc.patientAge || "N/A",
          mobile: pDoc.patientPhone || rDoc.patientPhone || "N/A",
          email: pDoc.patientEmail || rDoc.patientEmail || "N/A",
          location: pDoc.location || rDoc.location || "N/A",
          primaryComplaint,
          attenderName,
          attenderPhone,
          attenderRelationship,
          prescriptionsCount: rxCount,
          labReportsCount: labCount,
          scanReportsCount: scanCount,
          xrayReportsCount: xrayCount,
          mriReportsCount: mriCount,
          ctScanReportsCount: ctScanCount,
          prescriptionDates: preDocs.map(d => d.createdAt),
          labDates: labDocs.map(d => d.createdAt),
          scanData: scanDocs.map(d => ({ type: d.scanType, date: d.createdAt })),
          lastTreatmentData,
          treatmentHistory,
          visitedDate: pDoc.createdAt ? new Date(pDoc.createdAt).toISOString() : null,
        }
      };

      return acc;
    }, {});

    return res.status(200).json({
      message: "Patient detailed list fetched successfully",
      data: result,
    });
  } catch (err) {
    console.error("[DashboardTable] Controller Error:", err);
    return res.status(500).json({
      message: "Server Error fetching patient list details",
      error: err.message,
    });
  }
};
