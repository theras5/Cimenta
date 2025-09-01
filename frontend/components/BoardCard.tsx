import { View, Text, Image } from 'react-native';

interface BoardCardProps {
    icon: any;
    title: string;
    subtitle: string;
}

export default function BoardCard({ icon, title, subtitle }: BoardCardProps) {
  return (
    <View className="flex-row items-center bg-white rounded-xl shadow p-4 mb-3">
      <View className="mr-3">
        <Image source={icon} className="w-8 h-8" resizeMode="contain" />
      </View>
      <View>
        <Text className="font-bold text-base">{title}</Text>
        <Text className="text-gray-500 text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}