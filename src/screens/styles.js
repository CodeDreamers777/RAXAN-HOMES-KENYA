import { StyleSheet } from "react-native";

// Updated color scheme
const PRIMARY_COLOR = "#2C3E50";
const SECONDARY_COLOR = "#34495E";
const ACCENT_COLOR = "#3498DB";
const TEXT_DARK = "#2C3E50";
const TEXT_LIGHT = "#ECF0F1";
const BACKGROUND_COLOR = "#ECF0F1";
const INPUT_BG = "#FFFFFF";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
    color: TEXT_DARK,
  },
  inputContainer: {
    width: "80%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
    color: SECONDARY_COLOR,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: TEXT_DARK,
  },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: TEXT_LIGHT,
    fontSize: 18,
    fontWeight: "bold",
  },
  linkText: {
    color: ACCENT_COLOR,
    fontSize: 16,
    marginTop: 20,
  },
  pickerWrapper: {
    backgroundColor: INPUT_BG,
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    width: "80%",
  },
  checkbox: {
    marginRight: 10,
  },
  termsText: {
    fontSize: 14,
    color: TEXT_DARK,
    flex: 1,
  },
  disabledButton: {
    backgroundColor: "#95a5a6",
  },
  eyeIcon: {
    padding: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: INPUT_BG,
    borderRadius: 20,
    padding: 20,
    width: "90%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: TEXT_DARK,
  },
  closeButton: {
    marginTop: 15,
  },
  closeButtonText: {
    color: SECONDARY_COLOR,
    fontSize: 16,
  },
  forgotPasswordLink: {
    marginTop: 10,
    marginBottom: 20,
  },
  // OTP Screen styles
  otpTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: TEXT_DARK,
    marginBottom: 10,
    textAlign: "center",
  },
  otpDescription: {
    fontSize: 16,
    color: SECONDARY_COLOR,
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
