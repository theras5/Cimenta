import type React from "react"
import { View, Text, StyleSheet } from "react-native"

interface NotificationCardProps {
  message: string
  highlight: string
}

const NotificationCard: React.FC<NotificationCardProps> = ({ message, highlight }) => {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>👷‍♂️</Text>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.message}>
            {message} <Text style={styles.highlight}>"{highlight}"</Text>
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    padding: 20,
    marginBottom: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 16,
  },
  icon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
  },
  highlight: {
    fontWeight: "600",
    color: "#1f2937",
  },
})

export default NotificationCard
