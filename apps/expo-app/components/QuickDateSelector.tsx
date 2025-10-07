
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface QuickDateSelectorProps {
  date: Date | null;
  onDateChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  placeholder?: string;
}

export const QuickDateSelector: React.FC<QuickDateSelectorProps> = ({
  date,
  onDateChange,
  label,
  minimumDate,
  maximumDate,
  placeholder = "Seleccionar fecha y hora",
}) => {
  const [show, setShow] = React.useState<false | "date" | "time">(false);
  const [tempDate, setTempDate] = React.useState<Date>(date || new Date());

  const handleChange = (_: any, selectedDate?: Date) => {
    if (show === "date") {
      if (selectedDate) {
        setTempDate(selectedDate);
        setShow("time");
      } else {
        setShow(false);
      }
    } else if (show === "time") {
      setShow(false);
      if (selectedDate) {
        const newDate = new Date(tempDate);
        newDate.setHours(selectedDate.getHours());
        newDate.setMinutes(selectedDate.getMinutes());
        onDateChange(newDate);
      }
    }
  };

  const displayValue = date
    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : placeholder;

  return (
    <View style={{ marginBottom: 16 }}>
      {label && (
        <Text style={{ color: "#374151", fontWeight: "500", marginBottom: 8 }}>{label}</Text>
      )}
      <TouchableOpacity
        onPress={() => setShow("date")}
        style={{
          backgroundColor: "#fff",
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <Text style={{ color: date ? "#111827" : "#9ca3af" }}>{displayValue}</Text>
      </TouchableOpacity>
      {show === "date" && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handleChange}
        />
      )}
      {show === "time" && (
        <DateTimePicker
          value={date || new Date()}
          mode="time"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
};
