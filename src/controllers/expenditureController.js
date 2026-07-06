import doctorPurchase from "../models/expenditure.model.js";
import { createDBService } from "../services/db.service.js";

const purchaseService = createDBService(doctorPurchase);

const parseIfString = (data, fallback) => {
  if (!data) return fallback;
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (err) {
      throw new Error("Invalid JSON format");
    }
  }
  return data;
};

export const addPurchase = async (req, res) => {
  try {
    const { billInvoiceNo, billDate } = req.body;

    const supplier = parseIfString(req.body.supplier, {});
    const products = parseIfString(req.body.products, []);
    const financials = parseIfString(req.body.financials, {});
    const payment = parseIfString(req.body.payment, {});
    const billFile = req.file || null;

    if (!billInvoiceNo || !supplier?.name || products.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedProducts = products.map((p) => ({
      ...p,
      quantity: Number(p.quantity) || 0,
      amount: Number(p.amount) || 0,
    }));

    const subtotal = normalizedProducts.reduce(
      (sum, p) => sum + p.amount * p.quantity,
      0
    );

    // Use nested discount/gst structure!
    const discountPercent = Number(financials?.discount?.percentage ?? 0);
    const discountAmount = Number(
      financials?.discount?.amount ?? (subtotal * discountPercent) / 100
    );

    const gstPercent = Number(financials?.gst?.percentage ?? 0);
    const gstAmount = Number(
      financials?.gst?.amount ??
      ((subtotal - discountAmount) * gstPercent) / 100
    );

    const totalAmount = subtotal - discountAmount + gstAmount;
    const netAmount = totalAmount; // If you want netAmount same as totalAmount
    const paidAmount = Number(payment?.paidAmount) || 0;
    const dueAmount = totalAmount - paidAmount;

    const purchase = await purchaseService.create({
      billInvoiceNo,
      billDate,
      supplier,
      products: normalizedProducts,
      financials: {
        subtotal,
        totalAmount,
        gst: {
          percentage: gstPercent,
          amount: gstAmount,
        },
        discount: {
          percentage: discountPercent,
          amount: discountAmount,
        },
        netAmount,
      },
      payment: {
        ...payment,
        paidAmount,
        dueAmount,
      },
      attachments: billFile ? [billFile.filename] : [],
      link: billFile
        ? `${req.protocol}://${req.get("host")}/uploads/expenditure-bills/${billFile.filename
        }`
        : null,
    });

    return res.status(201).json({
      message: "Purchase added successfully",
      purchase,
    });
  } catch (error) {
    console.error("Add purchase error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const updatePurchase = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = parseIfString(req.body.supplier, {});
    const products = parseIfString(req.body.products, []);
    const financials = parseIfString(req.body.financials, {});
    const payment = parseIfString(req.body.payment, {});
    const billFile = req.file || null;

    let updateData = {
      billInvoiceNo: req.body.billInvoiceNo,
      billDate: req.body.billDate,
      supplier,
      products,
      financials,
      payment,
    };

    // Recalculate financials if products updated
    if (products.length > 0) {
      const normalizedProducts = products.map((p) => ({
        ...p,
        quantity: Number(p.quantity) || 0,
        amount: Number(p.amount) || 0,
      }));

      const subtotal = normalizedProducts.reduce(
        (sum, p) => sum + p.amount * p.quantity,
        0
      );

      // Use nested discount/gst structure!
      const discountPercent = Number(financials?.discount?.percentage ?? 0);
      const discountAmount = Number(
        financials?.discount?.amount ?? (subtotal * discountPercent) / 100
      );

      const gstPercent = Number(financials?.gst?.percentage ?? 0);
      const gstAmount = Number(
        financials?.gst?.amount ??
        ((subtotal - discountAmount) * gstPercent) / 100
      );

      const totalAmount = subtotal - discountAmount + gstAmount;
      const netAmount = totalAmount;
      const paidAmount = Number(payment?.paidAmount) || 0;
      const dueAmount = totalAmount - paidAmount;

      updateData.products = normalizedProducts;
      updateData.financials = {
        subtotal,
        totalAmount,
        gst: {
          percentage: gstPercent,
          amount: gstAmount,
        },
        discount: {
          percentage: discountPercent,
          amount: discountAmount,
        },
        netAmount,
      };
      updateData.payment = {
        ...payment,
        paidAmount,
        dueAmount,
      };
    }

    // Handle image update
    if (billFile) {
      updateData.attachments = [billFile.filename];
      updateData.link = `${req.protocol}://${req.get(
        "host"
      )}/uploads/expenditure-bills/${billFile.filename}`;
    }

    const updated = await purchaseService.update(id, updateData);

    if (!updated) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    return res.status(200).json({
      message: "Purchase updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update purchase error:", error);
    return res.status(500).json({ message: error.message });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const purchases = await purchaseService.getAll({ isDeleted: false });
    return res.status(200).json({
      message: "Purchases fetched successfully",
      data: purchases,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const purchase = await purchaseService.getOne({
      _id: id,
      isDeleted: false,
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    return res.status(200).json({
      message: "Purchase fetched successfully",
      data: purchase,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const deletePurchase = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await purchaseService.update(id, { isDeleted: true });
    if (!deleted) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    return res.status(200).json({
      message: "Purchase deleted successfully",
      data: deleted,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getEquipmentNames = async (req, res) => {
  try {
    const expenditure = await purchaseService.getAll({
      "products.type": "equipment", // ✅ Proper key format for nested fields
      isDeleted: false,
    });

    const equipmentNames = expenditure.flatMap((purchase) =>
      purchase.products
        .filter((item) => item.type === "equipment")
        .map((item) => item.productName)
    );
    return res.status(200).json({
      message: "Expenditure fetched successfully",
      data: equipmentNames,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBrandNames = async (req, res) => {
  try {
    const { productName } = req.params;

    const expenditureList = await purchaseService.getAll({
      "products.productName": productName,
      isDeleted: false,
    });

    // Extract brand names for matching productName
    const brandNames = expenditureList.flatMap((purchase) =>
      purchase.products
        .filter((product) => product.productName === productName)
        .map((product) => product.brand)
    );
    return res.status(200).json({
      message: "Brand names fetched successfully",
      data: brandNames,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const getCounts = async (req, res) => {
  try {
    const { productName, brand } = req.params;
    const expenditureList = await purchaseService.getAll({
      "products.productName": productName,
      "products.brand": brand,
      isDeleted: false,
    });
    // Calculate the total quantity for matching products
    const totalCount = expenditureList.reduce((acc, purchase) => {
      const matchingProducts = purchase.products.filter(
        (product) =>
          product.productName === productName && product.brand === brand
      );
      const sumQuantity = matchingProducts.reduce(
        (sum, product) => sum + product.quantity,
        0
      );
      return acc + sumQuantity;
    }, 0);

    return res.status(200).json({
      message: "Count fetched successfully",
      productName,
      brand,
      totalCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
