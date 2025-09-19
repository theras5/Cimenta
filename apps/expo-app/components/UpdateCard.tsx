import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface UpdateCardProps {
  title: string;
  description?: string;
  author?: string;
  timeAgo?: string;
  imageUrl?: string | null;
  hasPlayButton?: boolean;
  onPress?: () => void;
}

const UpdateCard: React.FC<UpdateCardProps> = ({
  title,
  description,
  author = "Usuario",
  timeAgo = "",
  imageUrl,
  hasPlayButton = false,
  onPress,
}) => {
  const hasMedia = !!imageUrl && imageUrl.trim() !== "";

  return (
    <TouchableOpacity onPress={onPress} style={styles.shadowContainer}>
      {hasMedia ? (
        <View style={styles.mediaWrapper}>
          <ImageBackground
            source={{ uri: imageUrl! }}
            style={styles.mediaBackground}
            imageStyle={styles.mediaImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0.05)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.mediaOverlay}
            />
            {hasPlayButton && (
              <View style={styles.playButton}>
                <Ionicons name="play" size={22} color="white" />
              </View>
            )}
          </ImageBackground>
        </View>
      ) : (
        // Simple gradient header when no media
        <View style={styles.gradientWrapper}>
          <LinearGradient
            colors={["#1e3a8a", "#3b82f6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.backgroundContainer}
          />
        </View>
      )}

      <View style={styles.contentWrapper}>
        <View style={styles.contentRow}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Text style={styles.author}>por {author}</Text>

            {description ? (
              <Text style={styles.description}>{description}</Text>
            ) : (
              null
            )}
          {timeAgo ? <Text style={styles.timeAgo}>{timeAgo}</Text> : null}
          </View>

        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  mediaWrapper: {
    height: 160,
    width: "100%",
    backgroundColor: "#111827",
  },
  mediaBackground: {
    flex: 1,
    justifyContent: "center",
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  playButton: {
    position: "absolute",
    alignSelf: "center",
    top: "45%",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  gradientWrapper: {
    height: 30,
    overflow: "hidden",
  },
  backgroundContainer: {
    flex: 1,
  },
  contentWrapper: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  contentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#4b5563",
    paddingTop: 10,
  },
  author: {
    fontSize: 13,
    color: "#6b7280",
  },
  timeAgo: {
    fontSize: 12,
    color: "#9ca3af",
    alignSelf: "flex-end",
    paddingTop: 4,
  },
});

export default UpdateCard;
