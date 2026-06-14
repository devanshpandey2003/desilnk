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

  addMeraDocAddress: async (patientId, location) => {
    const s = (v, fallback = "") => (v == null ? fallback : String(v));
    const response = await api.post("/user/api/v1/user/address/create", {
      name:         s(location.name,         "Patient"),
      mobileNumber: s(location.mobileNumber, ""),
      lat:          s(location.lat,          "0"),
      long:         s(location.long,         "0"),
      addressLine1: s(location.addressLine1, ""),
      addressLine2: s(location.addressLine2, ""),
      district:     s(location.district || location.city, ""),
      pincode:      s(location.pincode,      ""),
      city:         s(location.city,         ""),
      state:        s(location.state,        ""),
      country:      s(location.country,      "India"),
      addressType:  "HOME",
      userId:       patientId,
    });
    return response.data;
  },

  getMeraDocAddresses: async (patientId) => {
    const response = await api.get("/user/api/v1/user/address/list", {
      data: { userId: patientId },
    });
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
