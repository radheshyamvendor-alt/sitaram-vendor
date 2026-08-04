"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import axios from "axios";

export interface PatientInput {
  prescriptionNumber: string;
  name: string;
  mobile: string;
  address: string;
  gender?: string;
  age?: number;
}

export interface CreateOrderInput {
  prescriptionNumber: string;
  patient: PatientInput;
  medicines?: string;
  chemistEmail?: string;
}

export async function createOrder(input: CreateOrderInput) {
  try {
    const rxNo = input.prescriptionNumber;
    const existingOrder = await prisma.order.findFirst({
      where: { prescriptionNumber: rxNo },
    });

    if (existingOrder) {
      return {
        success: false,
        error: `An order for prescription number "${rxNo}" already exists (Status: ${existingOrder.status}).`,
      };
    }

    const order = await prisma.order.create({
      data: {
        prescriptionNumber: rxNo,
        patientName: input.patient.name,
        patientMobile: input.patient.mobile,
        patientAddress: input.patient.address,
        patientGender: input.patient.gender || null,
        patientAge: input.patient.age || null,
        medicines: input.medicines || null,
        status: "PENDING",
        chemistEmail: input.chemistEmail || null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true, data: order };
  } catch (error) {
    console.error("Failed to create order:", error);
    const message = error instanceof Error ? error.message : "Failed to create order";
    return { success: false, error: message };
  }
}

export async function getDashboardOverview(
  page: number = 1,
  pageSize: number = 10,
  chemistEmail?: string,
  search?: string,
  chemistId?: string
) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const baseWhereConditions: any[] = [];
    if (chemistId || chemistEmail) {
      const orFilters: any[] = [];
      if (chemistId) orFilters.push({ chemistId: chemistId });
      if (chemistEmail) orFilters.push({ chemistEmail: chemistEmail });

      if (orFilters.length > 0) {
        baseWhereConditions.push({ OR: orFilters });
      }
    }

    const baseWhere = baseWhereConditions.length > 0 ? { AND: baseWhereConditions } : {};

    const whereToday = {
      ...baseWhere,
      createdAt: { gte: startOfToday },
    };

    const wherePending = {
      ...baseWhere,
      status: { in: ["PENDING", "SHIPPED"] },
    };

    const whereCompleted = {
      ...baseWhere,
      status: "COMPLETED",
    };

    const orderWhereConditions = [...baseWhereConditions];
    if (search) {
      orderWhereConditions.push({
        OR: [
          { prescriptionNumber: { contains: search, mode: "insensitive" } },
          { patientName: { contains: search, mode: "insensitive" } },
          { patientMobile: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    const orderWhere = orderWhereConditions.length > 0 ? { AND: orderWhereConditions } : {};
    const skip = (page - 1) * pageSize;

    const [ordersToday, pendingDeliveries, completedDeliveries, orders, totalCount] = await Promise.all([
      prisma.order.count({ where: whereToday }),
      prisma.order.count({ where: wherePending }),
      prisma.order.count({ where: whereCompleted }),
      prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.order.count({ where: orderWhere }),
    ]);

    return {
      success: true,
      stats: {
        totalMedicines: 0,
        ordersToday,
        pendingDeliveries,
        completedDeliveries,
      },
      orders,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (error) {
    console.error("Failed to fetch dashboard overview:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard overview";
    return { success: false, error: message };
  }
}

export async function getOrders(page?: number, pageSize?: number, chemistEmail?: string, search?: string) {
  try {
    const res = await getDashboardOverview(page || 1, pageSize || 10, chemistEmail, search);
    if (!res.success) return res;
    return {
      success: true,
      data: res.orders,
      pagination: res.pagination,
    };
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch orders";
    return { success: false, error: message };
  }
}

export async function getDashboardStats(chemistEmail?: string) {
  try {
    const res = await getDashboardOverview(1, 10, chemistEmail);
    if (!res.success) return res;
    return {
      success: true,
      stats: res.stats,
      recentOrders: res.orders ? res.orders.slice(0, 5) : [],
    };
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard stats";
    return { success: false, error: message };
  }
}

export async function startDelivery(orderId: string) {
  try {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        otp: mockOtp,
      },
    });
    
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true, data: order, mockOtp };
  } catch (error) {
    console.error("Failed to start delivery:", error);
    const message = error instanceof Error ? error.message : "Failed to start delivery";
    return { success: false, error: message };
  }
}

export async function verifyOtpApi(prescriptionNo: string, otp: string, accessToken: string) {
  try {
    let apiReachable = false;
    let apiSuccess = false;
    let apiMessage = "";

    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/verify",
        { PrescriptionNo: prescriptionNo, otp },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      apiReachable = true;
      apiSuccess = response.data?.success === true;
      apiMessage = response.data?.message || "";
    } catch (apiError) {
      console.warn("HIS OTP Verify API unreachable:", apiError);
    }

    if (apiReachable) {
      if (!apiSuccess) {
        return { success: false, error: apiMessage || "OTP verification failed" };
      }

      const localOrder = await prisma.order.findFirst({
        where: { prescriptionNumber: prescriptionNo },
      });
      if (localOrder) {
        await prisma.order.update({
          where: { id: localOrder.id },
          data: { status: "COMPLETED" },
        });
      }
      revalidatePath("/dashboard");
      revalidatePath("/dashboard/otp");
      return { success: true, message: apiMessage || "OTP verified successfully" };
    }

    return { success: false, error: "Unable to reach ONGC HIS API. Please check your network and try again." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP Verification failed";
    return { success: false, error: message };
  }
}

export async function resendOtpApi(prescriptionNo: string, accessToken: string) {
  try {
    let apiReachable = false;
    let apiSuccess = false;
    let apiMessage = "";

    try {
      const response = await axios.post(
        "https://hischemistapi.ongc.co.in/api/Otp/resend",
        { PrescriptionNo: Number(prescriptionNo) },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      apiReachable = true;
      apiSuccess = response.data?.success === true;
      apiMessage = response.data?.message || "";
    } catch (apiError) {
      console.warn("HIS OTP Resend API unreachable:", apiError);
    }

    if (apiReachable) {
      if (!apiSuccess) {
        return { success: false, error: apiMessage || "Failed to resend OTP" };
      }
      return { success: true, message: apiMessage || "OTP resent successfully" };
    }

    return { success: false, error: "Unable to reach ONGC HIS API. Please check your network and try again." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP resend failed";
    return { success: false, error: message };
  }
}

export async function completeOrderLocal(prescriptionNo: string) {
  try {
    const localOrder = await prisma.order.findFirst({
      where: { prescriptionNumber: prescriptionNo },
    });
    if (localOrder) {
      await prisma.order.update({
        where: { id: localOrder.id },
        data: { status: "COMPLETED" },
      });
    }
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true };
  } catch (error) {
    console.error("Failed to update local order status:", error);
    return { success: false, error: "Failed to update local order status" };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Completed orders cannot be deleted" };
    }

    await prisma.order.delete({
      where: { id: orderId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete order:", error);
    const message = error instanceof Error ? error.message : "Failed to delete order";
    return { success: false, error: message };
  }
}

export interface UpdateOrderPatientInput {
  name: string;
  mobile: string;
  address: string;
}

export interface UpdateOrderInput {
  prescriptionNumber: string;
  patient: UpdateOrderPatientInput;
  medicines?: string;
}

export async function updateOrder(orderId: string, input: UpdateOrderInput) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    if (order.status === "COMPLETED") {
      return { success: false, error: "Completed orders cannot be modified" };
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        prescriptionNumber: input.prescriptionNumber,
        patientName: input.patient.name,
        patientMobile: input.patient.mobile,
        patientAddress: input.patient.address,
        medicines: input.medicines !== undefined ? input.medicines : order.medicines,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    return { success: true, data: updatedOrder };
  } catch (error) {
    console.error("Failed to update order:", error);
    const message = error instanceof Error ? error.message : "Failed to update order";
    return { success: false, error: message };
  }
}

export interface DirectOrderInput {
  prescriptionNumber?: string;
  patientName?: string;
  patientMobile?: string;
  patientAddress?: string;
  patientGender?: string;
  patientAge?: number;
  medicines?: string;
  chemistId?: string;
  chemistEmail?: string;
  gmailMessageId?: string;
}

export async function createDirectOrder(input: DirectOrderInput) {
  try {
    const rxNo = input.prescriptionNumber || `RX-${Date.now()}`;
    
    const existingOrder = await prisma.order.findFirst({
      where: { prescriptionNumber: rxNo },
    });
    if (existingOrder) {
      return {
        success: false,
        error: `An order for prescription number "${rxNo}" already exists (Status: ${existingOrder.status}).`,
      };
    }

    const orderData: any = {
      prescriptionNumber: rxNo,
      patientName: input.patientName || null,
      patientMobile: input.patientMobile || null,
      patientAddress: input.patientAddress || null,
      patientGender: input.patientGender || null,
      patientAge: input.patientAge || null,
      medicines: input.medicines || null,
      status: "PENDING",
      chemistId: input.chemistId || null,
      chemistEmail: input.chemistEmail || null,
    };

    const order = await prisma.order.create({
      data: orderData,
    });

    if (input.gmailMessageId && input.chemistEmail) {
      try {
        await prisma.gmailPrescription.updateMany({
          where: {
            chemistEmail: input.chemistEmail,
            messageId: input.gmailMessageId,
          },
          data: {
            status: "ORDERED",
          },
        });
      } catch (err) {
        console.warn("Failed to update GmailPrescription status to ORDERED:", err);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/otp");
    revalidatePath("/dashboard/notifications");
    return { success: true, data: order };
  } catch (error) {
    console.error("Failed to create direct order:", error);
    const message = error instanceof Error ? error.message : "Failed to create order";
    return { success: false, error: message };
  }
}
