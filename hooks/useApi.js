import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DoctorService } from "../services/doctor.service";
import { UserService } from "../services/user.service";
import { AppointmentService } from "../services/appointment.service";

// =====================
// Doctor Hooks
// =====================

export const useSpecialities = (params, options) => {
  return useQuery({
    queryKey: ["specialities", params],
    queryFn: () => DoctorService.getSpecialities(params),
    ...options
  });
};

export const useDoctors = (params, options) => {
  return useQuery({
    queryKey: ["doctors", params],
    queryFn: () => DoctorService.getDoctors(params),
    ...options
  });
};

// =====================
// User & Auth Hooks
// =====================

export const useGenerateToken = () => {
  return useMutation({
    mutationFn: UserService.generateToken,
  });
};

export const useRegisterPatient = () => {
  return useMutation({
    mutationFn: (data) => UserService.registerPatient(data),
  });
};

// =====================
// Appointment Hooks
// =====================

export const useSlots = (params, options) => {
  return useQuery({
    queryKey: ["slots", params],
    queryFn: () => AppointmentService.getSlots(params),
    enabled: !!(params && params.startDate && params.endDate),
    ...options,
  });
};

export const useConcerns = (params, options) => {
  return useQuery({
    queryKey: ["concerns", params],
    queryFn: () => AppointmentService.getConcerns(params),
    ...options,
  });
};

export const useBookConsultation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => AppointmentService.bookConsultation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
};

export const useAppointmentDetails = (appointmentId) => {
  return useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => AppointmentService.getAppointmentDetails(appointmentId),
    enabled: !!appointmentId,
  });
};

export const useRescheduleConsultation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ appointmentId, data }) =>
      AppointmentService.rescheduleConsultation(appointmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["slots"] });
      queryClient.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
};
