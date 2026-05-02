import { api } from "../lib/api";

export const AppointmentService = {
  getConcerns: async (params) => {
    const response = await api.get("/appointment/api/v1/concern/", { params });
    return response.data;
  },

  getSlots: async (params) => {
    const response = await api.get("/appointment/api/v1/slots/getGeneralSlots", { params });
    return response.data;
  },

  bookConsultation: async (data) => {
    const idempotencyKey = data.idempotencyKey || (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? `${crypto.randomUUID()}_PT` : `${Math.random().toString(36).substring(2)}_PT`);
    
    const payload = { ...data };
    delete payload.idempotencyKey;

    const response = await api.post("/appointment/api/v1/appointment/appointment-create", payload, {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    });
    return response.data;
  },

  updateConsultation: async (appointmentId, data) => {
    const response = await api.post(`/appointment/api/v1/appointment/appointment-update/${appointmentId}`, data);
    return response.data;
  },

  rescheduleConsultation: async (appointmentId, data) => {
    const response = await api.post(`/appointment/api/v1/appointment/appointment-update/${appointmentId}`, data);
    return response.data;
  },

  cancelConsultation: async (appointmentId) => {
    const response = await api.post(`/appointment/api/v1/appointment/appointment-cancel/${appointmentId}`);
    return response.data;
  },

  blockSlot: async (data) => {
    const response = await api.post("/appointment/api/v1/slots/blockUnblockSlot", data);
    return response.data;
  },

  uploadDocuments: async (appointmentId, documents) => {
    const response = await api.post(`/appointment/api/v1/appointment/appointment-upload-documents/${appointmentId}`, { documents });
    return response.data;
  },

  getAppointmentDetails: async (appointmentId) => {
    const response = await api.get(`/appointment/api/v1/appointment/appointment/${appointmentId}`);
    return response.data;
  },

  getPrescription: async (appointmentId) => {
    const response = await api.get(`/appointment/api/v1/appointment/appointmentData/${appointmentId}`);
    return response.data;
  },
};
