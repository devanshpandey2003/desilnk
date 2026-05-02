import { api } from "../lib/api";

export const UserService = {
  generateToken: async () => {
    const response = await api.post("/user/api/v1/sso/tenant");
    const token = response.data?.data?.token;
    if (token && typeof window !== "undefined") {
      localStorage.setItem("accessToken", token);
      console.log("Access token generated and saved locally.");
    }
    return response.data;
  },

  registerPatient: async (data) => {
    const response = await api.post("/user/api/v1/user/patient", data);
    return response.data;
  },

  updatePatient: async (patientId, data) => {
    const response = await api.post(`/user/api/v1/user/patient/${patientId}`, data);
    return response.data;
  },

  addFamilyMember: async (patientId, members) => {
    const response = await api.post(`/user/api/v1/user/addFamilyMember/${patientId}`, members);
    return response.data;
  },

  removeFamilyMember: async (patientId, memberAccountId) => {
    const response = await api.post(`/user/api/v1/user/removeFamilyMember/${patientId}`, { memberAccountId });
    return response.data;
  },

  updateFamilyMember: async (familyMemberId, data) => {
    const response = await api.post(`/user/api/v1/user/updateFamilyMember/${familyMemberId}`, data);
    return response.data;
  },
};
