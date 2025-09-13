import React from 'react'
import { Stack } from 'expo-router'

const _Layout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
        animation: 'slide_from_right',
      }}
    />
  )
}

export default _Layout