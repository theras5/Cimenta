import { View, Text, Image, TouchableOpacity } from 'react-native';

interface ShortcutCardProps {
  icon: any;
  label: string;
  onPress: () => void;
}


export default function ShortcutCard({ icon, label, onPress }: ShortcutCardProps) {
  return (
    <TouchableOpacity onPress={onPress} className="items-center mx-2">
      <View className="bg-white rounded-full shadow p-4 mb-2">
        <Image source={icon} className="w-7 h-7" resizeMode="contain" />
      </View>
      <Text numberOfLines={2} className="text-xs text-center" style={{ width: 80 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}