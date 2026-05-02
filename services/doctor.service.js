import { api } from "../lib/api";

export const DoctorService = {
  getSpecialities: async (params) => {
    const response = await api.get("/user/api/v1/doctor/listSpecialities", { params });
    const data = response.data;
    const list = Array.isArray(data?.data) ? data.data : data?.data?.list || [];
    console.log("[getSpecialities] Total count:", list.length);
    console.log("[getSpecialities] Names:", list.map(s => s.specialtyName || s.name));
    return data;
  },

  getDoctors: async (params) => {
    console.log("[getDoctors] Calling API with params:", params);
    const response = await api.get("/user/api/v1/doctor/findDoctor", { params });
    console.log("[getDoctors] API response - Doctors count:", response.data?.data?.list?.length);
    console.log("[getDoctors] Doctor names:", response.data?.data?.list?.map(d => d.firstName + " " + d.lastName));
    const firstDoc = response.data?.data?.list?.[0];
    if (firstDoc) console.log("[getDoctors] First doctor keys:", Object.keys(firstDoc), "| profileUrl:", firstDoc.profileUrl, "| profileImage:", firstDoc.profileImage);
    return response.data;
  },
};
