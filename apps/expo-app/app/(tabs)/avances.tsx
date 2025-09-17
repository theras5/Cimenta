import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import VideoCard from "@/components/VideoCard"
import NotificationCard from "@/components/NotificationCard"
import { router } from "expo-router"

const Avances = () => {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4">
              <Text className="text-gray-800 font-bold text-2xl">Avances</Text>
              {/* Floating action button */}
              <TouchableOpacity
                onPress={() => router.push("/updates/new-update")}
                className="bg-blue-600 w-12 h-12 rounded-full items-center justify-center"
                style={{
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3.84,
                  elevation: 5,
                }}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Video Card with Play Button */}
        <VideoCard title="Remodelacion en el comedor" author="Juan Doe" timeAgo="Hace 1 día" hasPlayButton={true} />

        {/* Notification Card */}
        <NotificationCard message="Se ha terminado" highlight="Instalación del aire" />

        {/* Regular Video Card */}
        <VideoCard title="Remodelacion en el comedor" author="Juan Doe" timeAgo="Hace 1 día" hasPlayButton={false} />

        {/* Another Video Card with Play Button */}
        <VideoCard title="Remodelacion en el comedor" author="Juan Doe" timeAgo="Hace 1 día" hasPlayButton={true} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1f2937",
  },
  addButton: {
    width: 56,
    height: 56,
    backgroundColor: "#3b82f6",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
})

export default Avances

