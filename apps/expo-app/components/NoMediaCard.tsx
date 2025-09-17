import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface NoMediaCardProps {
  title: string;
  description: string;
  author: string;
  timeAgo: string;
  onPress?: () => void;
}
const NoMediaCard: React.FC<NoMediaCardProps> = ({
  title,
  description,
  author,
  timeAgo,
  onPress
}) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.shadowContainer}>
      <View style={styles.gradientWrapper}>
        <LinearGradient
          colors={["#1e3a8a", "#3b82f6", "#06b6d4"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.backgroundContainer}
        />
      </View>
      
      <View style={styles.contentWrapper}>
        <View style={styles.content}>
          {/* Header con título, autor y fecha */}
          <View style={styles.headerRow}>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.author}>por {author}</Text>
            </View>
            <Text style={styles.timeAgo}>{timeAgo}</Text>
          </View>
          
          {/* Descripción con todo el ancho disponible */}
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
    borderRadius: 16,
  },
  gradientWrapper: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  backgroundContainer: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  contentWrapper: {
    backgroundColor: "white",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  content: {
    padding: 16,
    flexDirection: "column", // Cambiar de "row" a "column"
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  textContainer: {
    flex: 1,
  },
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
    marginBottom: 16,
  },
  patternContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  patternLine: {
    position: 'absolute',
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
    opacity: 0.2,
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  timeAgo: {
    fontSize: 12,
    color: "#9ca3af",
  },
});

export default NoMediaCard;