import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  StyleSheet 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { wp, hp, fp, sp } from '../utils/responsiveUtils';

const CustomPicker = ({ 
  selectedValue, 
  onValueChange, 
  items, 
  placeholder = "-- Sélectionnez --",
  icon,
  enabled = true 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const selectedItem = items.find(item => item.value === selectedValue);

  const handleSelect = (value) => {
    onValueChange(value);
    setIsVisible(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.modalItem,
        item.value === selectedValue && styles.modalItemSelected
      ]}
      onPress={() => handleSelect(item.value)}
    >
      <Text style={[
        styles.modalItemText,
        item.value === selectedValue && styles.modalItemTextSelected
      ]}>
        {item.label}
      </Text>
      {item.value === selectedValue && (
        <Ionicons name="checkmark" size={20} color="#2563eb" />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.container, !enabled && styles.containerDisabled]}
        onPress={() => enabled && setIsVisible(true)}
        disabled={!enabled}
      >
        {icon && <Ionicons name={icon === "business-outline" ? "business" : icon} size={20} color="#7f8c8d" style={styles.icon} />}
        
        <Text style={[
          styles.selectedText,
          !selectedItem && styles.placeholderText,
          !enabled && styles.disabledText
        ]}>
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={enabled ? "#7f8c8d" : "#bdc3c7"} 
        />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner</Text>
              <TouchableOpacity onPress={() => setIsVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.value ? item.value.toString() : 'null'}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: sp(12),
    marginBottom: sp(16),
    paddingHorizontal: sp(16),
    height: hp(56),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  containerDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  icon: {
    marginRight: sp(12),
  },
  selectedText: {
    flex: 1,
    fontSize: fp(16),
    color: '#1f2937',
    fontWeight: '600',
  },
  placeholderText: {
    color: '#6b7280',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
  disabledText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: sp(12),
    width: wp(320),
    maxHeight: hp(400),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    backgroundColor: '#2563eb',
    borderTopLeftRadius: sp(12),
    borderTopRightRadius: sp(12),
    paddingHorizontal: sp(20),
    paddingVertical: sp(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: fp(18),
    fontWeight: 'bold',
  },
  modalList: {
    maxHeight: hp(300),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp(20),
    paddingVertical: sp(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  modalItemText: {
    fontSize: fp(16),
    color: '#1f2937',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});

export default CustomPicker; 