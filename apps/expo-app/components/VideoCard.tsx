import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

interface VideoCardProps {
  title: string
  author: string
  timeAgo: string
  hasPlayButton?: boolean
  imageUrl: string
  onPress?: () => void
}

const VideoCard: React.FC<VideoCardProps> = ({ title, author, timeAgo, hasPlayButton = false, onPress, imageUrl }) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.shadowContainer}>
      {/* Contenedor del gradiente con border radius */}
      <View style={styles.gradientWrapper}>
        <LinearGradient
          colors={["#1e3a8a", "#3b82f6", "#06b6d4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundContainer}
        >
          {hasPlayButton && (
            <TouchableOpacity style={styles.playButton}>
              <Ionicons name="play" size={24} color="white" style={styles.playIcon} />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>
      
      {/* Contenedor del contenido */}
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.author}>por {author}</Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  shadowContainer: {
    // Contenedor principal que maneja la sombra
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
    borderRadius: 16,
  },
  gradientWrapper: {
    // Wrapper para el gradiente con border radius superior
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden", // Solo afecta al gradiente
  },
  backgroundContainer: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  playButton: {
    width: 64,
    height: 64,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    marginLeft: 4,
  },
  contentWrapper: {
    // Wrapper para el contenido con border radius inferior
    backgroundColor: "white",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  content: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  author: {
    fontSize: 14,
    color: "#6b7280",
  },
  timeAgo: {
    fontSize: 12,
    color: "#9ca3af",
  },
})

export default VideoCard