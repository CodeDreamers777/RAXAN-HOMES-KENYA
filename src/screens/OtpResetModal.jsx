import React from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "./styles";

const OtpResetModal = ({
  visible,
  onClose,
  otp,
  setOtp,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showNewPassword,
  setShowNewPassword,
  showConfirmNewPassword,
  setShowConfirmNewPassword,
  handleSubmit,
  isLoading,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="key-outline"
                size={24}
                color="#2C3E50"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Enter OTP"
                placeholderTextColor="#666"
                value={otp}
                onChangeText={setOtp}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color="#2C3E50"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#666"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                  size={24}
                  color="#2C3E50"
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={24}
                color="#2C3E50"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm New Password"
                placeholderTextColor="#666"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                secureTextEntry={!showConfirmNewPassword}
              />
              <TouchableOpacity
                onPress={() =>
                  setShowConfirmNewPassword(!showConfirmNewPassword)
                }
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={
                    showConfirmNewPassword ? "eye-off-outline" : "eye-outline"
                  }
                  size={24}
                  color="#2C3E50"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default OtpResetModal;
