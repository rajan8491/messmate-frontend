import { z } from "zod";
import { nitkkrEmailField, rollNoField, identifierField, passwordField, strongPasswordField, otpField, hostelIdField, studentNameField } from "./common";

// login schemas
export const loginPasswordSchema = z.object({
  identifier: identifierField,
  password: passwordField,
});

export const loginOtpSchema = z.object({
  identifier: identifierField,
  otp: otpField,
});

export const requestOtpSchema = z.object({
  identifier: identifierField,
});

export const standardSignupSchema = z.object({
  name: studentNameField,
  email: nitkkrEmailField,
  hostelId: hostelIdField,
  password: strongPasswordField,
});

export const googleProfileSetupSchema = z.object({
  name: studentNameField,
  hostelId: hostelIdField,
});


//verify email schema
export const verifyEmailSchema = z
  .object({
    email: nitkkrEmailField,
    otp: otpField
  });


//forget password schemas
export const forgotPasswordSchema = z.object({
  identifier: identifierField,
  otp: otpField,
  new: strongPasswordField,
  confirm: z.string(),
})
.refine((d)=> d.new === d.confirm, {
  message: "Password do not match",
  path: ["conifirm"]
});