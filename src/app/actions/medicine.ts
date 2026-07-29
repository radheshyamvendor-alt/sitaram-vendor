"use server";

export interface MedicineInput {
  name: string;
  category: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
}

export async function getMedicines(search?: string, category?: string, page?: number, pageSize?: number) {
  return { 
    success: true, 
    data: [],
    pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0 }
  };
}

export async function getInventoryStats() {
  return {
    success: true,
    data: {
      totalMedicines: 0,
      totalStock: 0,
      lowStockCount: 0,
      expiringSoonCount: 0,
      activeCategoriesCount: 0,
      tabletsStock: 0,
      capsulesStock: 0,
      syrupsStock: 0,
      otherStock: 0,
      recentUpdates: [],
    }
  };
}

export async function addMedicine(input: MedicineInput) {
  return { success: true, data: null };
}

export async function updateMedicine(id: string, input: MedicineInput) {
  return { success: true, data: null };
}

export async function deleteMedicine(id: string) {
  return { success: true };
}
