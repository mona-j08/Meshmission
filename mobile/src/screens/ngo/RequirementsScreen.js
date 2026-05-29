import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/colors';
import { NGO_REQUIREMENT_CATEGORY_LIST, CATEGORY_ICONS, CATEGORY_LABELS } from '../../constants/categories';
import { URGENCY, URGENCY_LABELS, URGENCY_ORDER } from '../../constants/urgency';
import { useAuth } from '../../hooks/useAuth';
import { useNGO } from '../../hooks/useNGO';
import PrimaryButton from '../../components/common/PrimaryButton';
import UrgencyBadge from '../../components/badges/UrgencyBadge';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { LoadingState, ErrorState, EmptyState } from '../../components/common/ScreenStates';

const RequirementsScreen = () => {
  const { user } = useAuth();
  const {
    requirements,
    loading,
    error,
    addRequirement,
    updateRequirement,
    deleteRequirement,
  } = useNGO(user?.uid);

  // Modal / Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null); // Null if adding, requirement object if editing
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(NGO_REQUIREMENT_CATEGORY_LIST[0]);
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState(URGENCY.NORMAL);
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Delete states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reqToDelete, setReqToDelete] = useState(null);

  // Sorting: Emergency first, then high priority, then normal
  const sortedRequirements = [...requirements].sort((a, b) => {
    const orderA = URGENCY_ORDER.indexOf(a.urgency);
    const orderB = URGENCY_ORDER.indexOf(b.urgency);
    // If order not found, fallback to index 99
    const indexA = orderA === -1 ? 99 : orderA;
    const indexB = orderB === -1 ? 99 : orderB;
    return indexA - indexB;
  });

  const openAddModal = () => {
    setEditingRequirement(null);
    setTitle('');
    setCategory(NGO_REQUIREMENT_CATEGORY_LIST[0]);
    setQuantity('');
    setUrgency(URGENCY.NORMAL);
    setDescription('');
    setModalVisible(true);
  };

  const openEditModal = (req) => {
    setEditingRequirement(req);
    setTitle(req.title || '');
    setCategory(req.category || NGO_REQUIREMENT_CATEGORY_LIST[0]);
    setQuantity(req.quantity || '');
    setUrgency(req.urgency || URGENCY.NORMAL);
    setDescription(req.description || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter an item name.');
      return;
    }
    if (!quantity.trim()) {
      Alert.alert('Validation Error', 'Please specify the quantity needed.');
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        title: title.trim(),
        category,
        quantity: quantity.trim(),
        urgency,
        description: description.trim(),
      };

      if (editingRequirement) {
        const success = await updateRequirement(editingRequirement.id, data);
        if (success) {
          Alert.alert('Success', 'Requirement updated successfully.');
          setModalVisible(false);
        } else {
          Alert.alert('Error', 'Failed to update requirement.');
        }
      } else {
        const docId = await addRequirement(data);
        if (docId) {
          Alert.alert('Success', 'Requirement created successfully.');
          setModalVisible(false);
        } else {
          Alert.alert('Error', 'Failed to create requirement.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setFormLoading(false);
    }
  };

  const confirmDelete = (req) => {
    setReqToDelete(req);
    setDeleteModalVisible(true);
  };

  const handleDelete = async () => {
    if (!reqToDelete) return;
    try {
      const success = await deleteRequirement(reqToDelete.id);
      if (success) {
        Alert.alert('Success', 'Requirement deleted successfully.');
      } else {
        Alert.alert('Error', 'Failed to delete requirement.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setDeleteModalVisible(false);
      setReqToDelete(null);
    }
  };

  const renderRequirementCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryIcon}>{CATEGORY_ICONS[item.category] || '📦'}</Text>
          <View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.categoryLabel}>{CATEGORY_LABELS[item.category] || item.category}</Text>
          </View>
        </View>
        <UrgencyBadge urgency={item.urgency} />
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.quantityText}>
          <Text style={styles.boldText}>Needed Quantity: </Text>
          {item.quantity}
        </Text>
        {item.description ? (
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionBtnSecondary}
          onPress={() => confirmDelete(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtnPrimary}
          onPress={() => openEditModal(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.editBtnText}>✏️ Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <LoadingState message="Loading NGO Requirements..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Requirements</Text>
            <Text style={styles.headerSubtitle}>List what supplies your NGO needs</Text>
          </View>
          <TouchableOpacity style={styles.addReqButton} onPress={openAddModal} activeOpacity={0.7}>
            <Text style={styles.addReqText}>+ Add Need</Text>
          </TouchableOpacity>
        </View>

        {/* Requirements List */}
        <FlatList
          data={sortedRequirements}
          keyExtractor={(item) => item.id}
          renderItem={renderRequirementCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              message="No supply requirements posted yet. Click '+ Add Need' to share what your NGO requires."
            />
          }
        />

        {/* Add/Edit Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>
                  {editingRequirement ? '✏️ Edit Supply Requirement' : '📦 Post New Supply Requirement'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={[1]} // Hacky FlatList container to avoid nested scroll issue while keyboard is up
                renderItem={() => (
                  <View style={styles.formContainer}>
                    {/* Item Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Item Name / Need *</Text>
                      <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. Basmati Rice, Woolen Blankets"
                        placeholderTextColor={Colors.disabledText}
                      />
                    </View>

                    {/* Category Selector */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Category *</Text>
                      <View style={styles.categoryGrid}>
                        {NGO_REQUIREMENT_CATEGORY_LIST.map((catKey) => {
                          const isSelected = category === catKey;
                          return (
                            <TouchableOpacity
                              key={catKey}
                              style={[
                                styles.categoryTab,
                                isSelected && styles.categoryTabSelected,
                              ]}
                              onPress={() => setCategory(catKey)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.categoryTabIcon}>{CATEGORY_ICONS[catKey]}</Text>
                              <Text
                                style={[
                                  styles.categoryTabText,
                                  isSelected && styles.categoryTabTextSelected,
                                ]}
                              >
                                {CATEGORY_LABELS[catKey]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Quantity */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Quantity Needed *</Text>
                      <TextInput
                        style={styles.input}
                        value={quantity}
                        onChangeText={setQuantity}
                        placeholder="e.g. 100 kg, 50 units"
                        placeholderTextColor={Colors.disabledText}
                      />
                    </View>

                    {/* Urgency Selector */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Urgency Level *</Text>
                      <View style={styles.urgencyGrid}>
                        {Object.values(URGENCY).map((level) => {
                          const isSelected = urgency === level;
                          let activeStyle = styles.urgencyTabNormal;
                          if (level === URGENCY.HIGH_PRIORITY) activeStyle = styles.urgencyTabHigh;
                          if (level === URGENCY.EMERGENCY) activeStyle = styles.urgencyTabEmergency;

                          return (
                            <TouchableOpacity
                              key={level}
                              style={[
                                styles.urgencyTab,
                                isSelected && activeStyle,
                              ]}
                              onPress={() => setUrgency(level)}
                              activeOpacity={0.7}
                            >
                              <Text
                                style={[
                                  styles.urgencyTabText,
                                  isSelected && styles.urgencyTabTextSelected,
                                ]}
                              >
                                {URGENCY_LABELS[level]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Additional details / specifications</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="e.g. Brand details, expiration dates, target age ranges..."
                        placeholderTextColor={Colors.disabledText}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                      />
                    </View>

                    {/* Submit Button */}
                    <PrimaryButton
                      title={
                        formLoading
                          ? 'Saving...'
                          : editingRequirement
                          ? 'Save Requirement'
                          : 'Post Requirement'
                      }
                      onPress={handleSave}
                      loading={formLoading}
                      style={styles.submitBtn}
                    />
                  </View>
                )}
                keyExtractor={() => 'form'}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          visible={deleteModalVisible}
          title="Delete Need?"
          message={`Are you sure you want to delete this requirement for '${reqToDelete?.title}'? This action cannot be undone.`}
          confirmText="Yes, Delete"
          cancelText="Keep Need"
          isDanger
          onConfirm={handleDelete}
          onCancel={() => setDeleteModalVisible(false)}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.navbarBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.heading,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: 2,
  },
  addReqButton: {
    backgroundColor: Colors.primaryButton,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addReqText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.white,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  categoryIcon: {
    fontSize: 26,
    backgroundColor: Colors.inputBackground,
    padding: 8,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
  },
  categoryLabel: {
    fontSize: 12,
    color: Colors.paragraph,
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 16,
  },
  quantityText: {
    fontSize: 14,
    color: Colors.heading,
  },
  boldText: {
    fontWeight: '600',
    color: Colors.paragraph,
  },
  descText: {
    fontSize: 13,
    color: Colors.paragraph,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 12,
    gap: 12,
  },
  actionBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorAlert,
  },
  actionBtnPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.icon,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: Colors.modalBackdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.heading,
  },
  closeIcon: {
    fontSize: 20,
    color: Colors.paragraph,
    padding: 4,
  },
  formContainer: {
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.paragraph,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.heading,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.inputBackground,
    gap: 4,
  },
  categoryTabSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryButton,
  },
  categoryTabIcon: {
    fontSize: 14,
  },
  categoryTabText: {
    fontSize: 13,
    color: Colors.paragraph,
    fontWeight: '500',
  },
  categoryTabTextSelected: {
    color: Colors.icon,
    fontWeight: '600',
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.inputBackground,
    alignItems: 'center',
  },
  urgencyTabNormal: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: Colors.successAlert,
  },
  urgencyTabHigh: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: Colors.warningAlert,
  },
  urgencyTabEmergency: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.errorAlert,
  },
  urgencyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  urgencyTabTextSelected: {
    color: Colors.heading,
  },
  textArea: {
    height: 80,
  },
  submitBtn: {
    marginTop: 8,
    height: 50,
  },
});

export default RequirementsScreen;
