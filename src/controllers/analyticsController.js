import Patient from "../models/patientModel/patient.model.js";

export const getPatientAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const totalPatients = await Patient.countDocuments(filter);

    const genderStats = await Patient.aggregate([
      { $match: filter },
      { $group: { _id: "$patientGender", count: { $sum: 1 } } },
      { $project: { gender: "$_id", count: 1, _id: 0 } },
    ]);

    const patients = await Patient.find(filter, { patientAge: 1 });
    const ageGroups = {
      "0-12": 0,
      "13-19": 0,
      "20-35": 0,
      "36-50": 0,
      "51-65": 0,
      "65+": 0,
    };
    patients.forEach((p) => {
      const age = parseInt(p.patientAge);
      if (isNaN(age)) return;
      if (age <= 12) ageGroups["0-12"]++;
      else if (age <= 19) ageGroups["13-19"]++;
      else if (age <= 35) ageGroups["20-35"]++;
      else if (age <= 50) ageGroups["36-50"]++;
      else if (age <= 65) ageGroups["51-65"]++;
      else ageGroups["65+"]++;
    });

    // 4️⃣ Monthly Trend
    const monthlyTrend = await Patient.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 5️⃣ Clinic-wise Count
    const clinicStats = await Patient.aggregate([
      { $match: filter },
      { $group: { _id: "$clinicId", totalPatients: { $sum: 1 } } },
      { $project: { clinicId: "$_id", totalPatients: 1, _id: 0 } },
      { $sort: { totalPatients: -1 } },
    ]);

    // ✅ Final Response
    res.json({
      success: true,
      totalPatients,
      genderStats,
      ageGroups,
      monthlyTrend,
      clinicStats,
      appliedFilter: filter.createdAt || "all",
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
