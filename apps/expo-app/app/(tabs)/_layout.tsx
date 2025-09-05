import { images } from "@/constants";
import cn from "clsx";
import { Tabs } from "expo-router";
import { Image, Text, View } from "react-native";

const TabBarIcon = ({ focused, icon, title }: TabBarIconProps) => (
  <View className="tab-icon pt-10 items-center justify-center min-w-[60px]">
    <Image
      source={icon}
      className="size-7"
      resizeMode="contain"
      tintColor={focused ? "#0065FF" : "#5D5F6D"}
    />
    <Text
      className={cn(
        "text-[10px] font-bold pt-1",
        focused ? "text-blue-500" : "text-grey-100"
      )}
    >
      {title}
    </Text>
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          borderTopLeftRadius: 50,
          borderTopRightRadius: 50,
          // borderBottomLeftRadius: 50,
          // borderBottomRightRadius: 50,
          // marginHorizontal: 20,
          height: 110,
          position: "absolute",
          // bottom: 40,
          backgroundColor: "white",
          shadowColor: "#1a1a1a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Home" icon={images.home} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: "Tasks",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Tasks" icon={images.tasks} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="teamCalendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Calendar" icon={images.calendar} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabBarIcon title="Profile" icon={images.profile} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
