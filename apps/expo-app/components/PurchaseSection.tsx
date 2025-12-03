import React from "react";
import { ScrollView, Text, View } from "react-native";
import PurchaseCard, { Purchase } from "./PurchaseCard";

interface PurchaseSectionProps {
  title: string;
  purchases: Purchase[];
}

const PurchaseSection: React.FC<PurchaseSectionProps> = ({
  title,
  purchases,
}) => (
  <View className="mb-6">
    <View className="flex-row justify-between items-center mb-4 px-4">
      <Text className="text-gray-800 font-bold text-xl">{title} ({purchases.length})</Text>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="pl-4"
    >
      {purchases.map((purchase) => (
        <PurchaseCard 
          key={purchase.id} 
          purchase={purchase}
        />
      ))}
    </ScrollView>
  </View>
);

export default PurchaseSection;
