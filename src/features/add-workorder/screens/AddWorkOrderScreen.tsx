import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import FeatherIcon from 'react-native-vector-icons/Feather';

import type { RootStackParamList } from '../../../app/navigation/types';

import AddEntityScreenLayout from '../../../shared/components/forms/AddEntityScreenLayout';
import AppPermissionsModal from '../../startup/components/AppPermissionsModal';
import CustomCalendar from '../../../shared/components/common/CustomCalendar';
import CustomTimePicker from '../../../shared/components/common/CustomTimePicker';
import { colors } from '../../../shared/theme/colors';

import { useAddWorkOrderViewModel } from '../viewmodels/useAddWorkOrderViewModel';
import { useWorkOrdersPermissionsViewModel } from '../../workorders/viewmodels/useWorkOrdersPermissionsViewModel';

import AddWorkOrderField from '../components/AddWorkOrderField';
import SuggestionInput from '../components/SuggestionInput';

import {
  searchLabor,
  searchMaterials,
  searchPriorities,
  searchWorkTypes,
} from '../services/addWorkOrderReferenceService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddWorkOrder'>;

type DateField = 'scheduled_start' | 'scheduled_finish';

const UI = {
  surface: '#111520',
  surfaceAlt: '#181c27',
  border: '#1e2235',
  borderAlt: '#252938',
  text: '#f8fafc',
  sub: '#9ca3b8',
};

function parseDateTime(value?: string | null) {
  if (!value) return null;

  const match = String(value).match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/,
  );

  if (!match) return null;

  const [, dd, mm, yyyy, hh, min] = match;

  return new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    Number(hh),
    Number(min),
  );
}

function formatDateTime(date: Date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function SectionCard({
  icon,
  title,
  subtitle,
  right,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <FeatherIcon name={icon as any} size={16} color={colors.primary} />
        </View>

        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? (
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
          ) : null}
        </View>

        {right}
      </View>

      {children}
    </View>
  );
}

function ToggleButton({
  open,
  onPress,
}: {
  open: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.toggleButton}
    >
      <FeatherIcon name={open ? 'minus' : 'plus'} size={19} color="#fff" />
    </TouchableOpacity>
  );
}

function DeleteButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.deleteButton}
    >
      <FeatherIcon name="trash-2" size={15} color={colors.danger} />
    </TouchableOpacity>
  );
}

export default function AddWorkOrderScreen({ navigation }: Props) {
  const vm = useAddWorkOrderViewModel();
  const permissionsVM = useWorkOrdersPermissionsViewModel(false);

  const [dateField, setDateField] = React.useState<DateField | null>(null);
  const [timeField, setTimeField] = React.useState<DateField | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const handleAiVoicePress = async () => {
    if (!vm.aiRecording) {
      const granted = await permissionsVM.ensureMicrophonePermission();
      if (!granted) return;
    }

    await vm.onAiVoicePress();
  };

  const openDatePicker = (field: DateField) => {
    const currentValue =
      field === 'scheduled_start'
        ? vm.workorder.scheduled_start
        : vm.workorder.scheduled_finish;

    const currentDate = parseDateTime(currentValue) || new Date();

    setSelectedDate(currentDate);
    setDateField(field);
  };

  const onDateConfirm = (date: Date) => {
    if (!dateField) return;

    const currentDate = selectedDate || new Date();

    const nextDate = new Date(date);
    nextDate.setHours(currentDate.getHours());
    nextDate.setMinutes(currentDate.getMinutes());

    const fieldToUpdate = dateField;

    setSelectedDate(nextDate);
    setDateField(null);

    setTimeout(() => {
      setTimeField(fieldToUpdate);
    }, 120);
  };

  const onTimeConfirm = (timeDate: Date) => {
  if (!timeField || !selectedDate) return;

  const nextDate = new Date(selectedDate);

  nextDate.setHours(timeDate.getHours());
  nextDate.setMinutes(timeDate.getMinutes());
  nextDate.setSeconds(0);
  nextDate.setMilliseconds(0);

  vm.updateField(timeField, formatDateTime(nextDate));

  setSelectedDate(null);
  setTimeField(null);
};

  const closeDatePicker = () => {
    setDateField(null);
    setSelectedDate(null);
  };

  const closeTimePicker = () => {
    setTimeField(null);
    setSelectedDate(null);
  };
  const handleSaveAndOpenDetails = async () => {
  const createdWorkOrder = await vm.addWorkOrder();

  if (!createdWorkOrder) {
    return;
  }

  const finalWonum = String(createdWorkOrder.wonum || '').trim();
  const finalSiteid = String(
    createdWorkOrder.siteid || vm.workorder.siteid || 'BEDFORD',
  ).trim();

  if (!finalWonum) {
    return;
  }

  navigation.replace('WorkOrderDetails', {
    wonum: finalWonum,
    siteid: finalSiteid,
    createdFromAdd: true,
    shouldRefreshWorkOrders: true,
    draftWorkOrder: {
      ...createdWorkOrder,
      wonum: finalWonum,
      siteid: finalSiteid,
    },
  });
};

  return (
    <>
      <AddEntityScreenLayout
        title="Ajouter un ordre de travail"
        badgeText={vm.workorder.siteid || undefined}
        badgeSecondaryText="Nouveau"
        submitTitle="Enregistrer"
        submitIcon="check"
        onSubmit={handleSaveAndOpenDetails}
        submitLoading={vm.loading}
        submitDisabled={!vm.canSubmit}
        onCancel={() => navigation.goBack()}
        successVisible={vm.successVisible}
        successTitle={vm.successTitle}
        successMessage={vm.successMessage}
        onCloseSuccess={vm.closeSuccess}
        errorVisible={vm.errorVisible}
        errorTitle={vm.errorTitle}
        errorMessage={vm.errorMessage}
        onCloseError={vm.closeError}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.aiBox}>
            <View style={styles.aiTextWrap}>
              <Text style={styles.aiTitle}>Assistant IA</Text>
              <Text style={styles.aiSubtitle}>
                Générer automatiquement les champs du Work Order
              </Text>
            </View>

            <TouchableOpacity
              onPress={vm.openAiModal}
              disabled={vm.aiLoading || vm.aiVoiceLoading}
              activeOpacity={0.88}
              style={[
                styles.aiOpenButton,
                (vm.aiLoading || vm.aiVoiceLoading) && styles.buttonDisabled,
              ]}
            >
              {vm.aiLoading || vm.aiVoiceLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <FeatherIcon name="cpu" size={17} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          <SectionCard
            icon="clipboard"
            title="Détails"
            subtitle="Informations principales"
          >
            <AddWorkOrderField
              label="Description"
              required
              icon="file-text"
              value={vm.workorder.description || ''}
              autoHeight
              minHeight={42}
              maxHeight={95}
              onChangeText={value => vm.updateField('description', value)}
            />

            <AddWorkOrderField
              label="Description longue"
              icon="align-left"
              value={vm.workorder.long_description || ''}
              autoHeight
              minHeight={42}
              maxHeight={120}
              onChangeText={value =>
                vm.updateField('long_description', value)
              }
            />
          </SectionCard>

          <SectionCard
            icon="cpu"
            title="Équipement"
            subtitle="Informations Maximo"
          >
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <AddWorkOrderField
                  label="Équipement"
                  icon="cpu"
                  value={vm.workorder.assetnum || ''}
                  autoCapitalize="characters"
                  onChangeText={value => vm.updateField('assetnum', value)}
                />
              </View>

              <View style={styles.rowItem}>
                <AddWorkOrderField
                  label="Emplacement"
                  icon="map-pin"
                  value={vm.workorder.location || ''}
                  autoCapitalize="characters"
                  onChangeText={value => vm.updateField('location', value)}
                />
              </View>
            </View>

            <AddWorkOrderField
              label="Description équipement"
              icon="info"
              value={vm.workorder.asset_description || ''}
              autoHeight
              minHeight={42}
              maxHeight={90}
              onChangeText={value =>
                vm.updateField('asset_description', value)
              }
            />

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <AddWorkOrderField
                  label="Site"
                  icon="home"
                  value={vm.workorder.siteid || ''}
                  autoCapitalize="characters"
                  onChangeText={value => vm.updateField('siteid', value)}
                />
              </View>

              <View style={styles.rowItem}>
                <AddWorkOrderField
                  label="Signalé par"
                  icon="user"
                  value={vm.workorder.reportedby || ''}
                  onChangeText={value => vm.updateField('reportedby', value)}
                />
              </View>
            </View>
          </SectionCard>

          <SectionCard
            icon="calendar"
            title="Planification"
            subtitle="Type de travail, priorité et dates"
          >
            <View style={styles.row}>
              <SuggestionInput
                label="Type de travail"
                icon="tool"
                value={vm.workorder.worktype || ''}
                onChangeText={value => vm.updateField('worktype', value)}
                search={searchWorkTypes}
                getLabel={item => item.label}
                getValue={item => item.value}
                onSelect={item => vm.updateField('worktype', item.value)}
              />

              <SuggestionInput
                label="Priorité"
                icon="flag"
                value={
                  vm.workorder.priority !== undefined && vm.workorder.priority !== null
                    ? String(vm.workorder.priority)
                    : ''
                }
                onChangeText={value =>
                  vm.updateField('priority', value ? Number(value) : undefined)
                }
                keyboardType="numeric"
                search={searchPriorities}
                getLabel={item => item.label}
                getValue={item => String(item.value)}
                onSelect={item => vm.updateField('priority', item.value)}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Pressable onPress={() => openDatePicker('scheduled_start')}>
                  <AddWorkOrderField
                    label="Début planifié"
                    icon="calendar"
                    value={vm.workorder.scheduled_start || ''}
                    editable={false}
                    onChangeText={() => {}}
                  />
                </Pressable>
              </View>

              <View style={styles.rowItem}>
                <Pressable onPress={() => openDatePicker('scheduled_finish')}>
                  <AddWorkOrderField
                    label="Fin planifiée"
                    icon="calendar"
                    value={vm.workorder.scheduled_finish || ''}
                    editable={false}
                    onChangeText={() => {}}
                  />
                </Pressable>
              </View>
            </View>
          </SectionCard>

          <SectionCard
            icon="list"
            title="Activités"
            subtitle="Tâches proposées par IA"
            right={
              <ToggleButton
                open={vm.showActivities}
                onPress={vm.toggleActivities}
              />
            }
          >
            {vm.showActivities ? (
              <>
                {(vm.workorder.activities || []).map((activity, index) => (
                  <View key={`activity-${index}`} style={styles.subCard}>
                    <View style={styles.subHeader}>
                      <Text style={styles.subTitle}>Activité {index + 1}</Text>
                      <DeleteButton onPress={() => vm.removeActivity(index)} />
                    </View>

                    <AddWorkOrderField
                      label="Description"
                      icon="check-square"
                      value={activity.description || ''}
                      autoHeight
                      minHeight={42}
                      maxHeight={90}
                      onChangeText={value =>
                        vm.updateActivity(index, 'description', value)
                      }
                    />

                    <View style={styles.row}>
                      <View style={styles.rowItem}>
                        <AddWorkOrderField
                          label="Task ID"
                          icon="hash"
                          value={activity.taskid || ''}
                          onChangeText={value =>
                            vm.updateActivity(index, 'taskid', value)
                          }
                        />
                      </View>

                      <View style={styles.rowItem}>
                        <AddWorkOrderField
                          label="Statut"
                          icon="activity"
                          value={activity.status || 'WAPPR'}
                          autoCapitalize="characters"
                          onChangeText={value =>
                            vm.updateActivity(index, 'status', value)
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={vm.addActivity}
                  activeOpacity={0.85}
                  style={styles.addLineButton}
                >
                  <FeatherIcon name="plus" size={15} color="#fff" />
                  <Text style={styles.addLineText}>Ajouter une activité</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </SectionCard>

          <SectionCard
            icon="box"
            title="Matériels"
            subtitle="Articles proposés par IA"
            right={
              <ToggleButton
                open={vm.showMaterials}
                onPress={vm.toggleMaterials}
              />
            }
          >
            {vm.showMaterials ? (
              <>
                {(vm.workorder.planned_materials || []).map(
                  (material, index) => (
                    <View key={`material-${index}`} style={styles.subCard}>
                      <View style={styles.subHeader}>
                        <Text style={styles.subTitle}>
                          Matériel {index + 1}
                        </Text>
                        <DeleteButton
                          onPress={() => vm.removeMaterial(index)}
                        />
                      </View>

                      <SuggestionInput
                        label="Article"
                        icon="box"
                        value={material.itemnum || ''}
                        onChangeText={value => vm.updateMaterial(index, 'itemnum', value)}
                        search={searchMaterials}
                        getLabel={item => `${item.itemnum} - ${item.description}`}
                        getValue={item => item.itemnum}
                        getSubLabel={item => item.location || ''}
                        onSelect={item => {
                          vm.updateMaterial(index, 'itemnum', item.itemnum);
                          vm.updateMaterial(index, 'description', item.description);
                          vm.updateMaterial(index, 'quantity', item.quantity || 1);
                          vm.updateMaterial(index, 'location', item.location || '');
                        }}
                      />

                      <AddWorkOrderField
                        label="Description"
                        icon="file-text"
                        value={material.description || ''}
                        autoHeight
                        minHeight={42}
                        maxHeight={90}
                        onChangeText={value =>
                          vm.updateMaterial(index, 'description', value)
                        }
                      />

                      <View style={styles.row}>
                        <View style={styles.rowItem}>
                          <AddWorkOrderField
                            label="Quantité"
                            icon="hash"
                            value={material.quantity ?? ''}
                            keyboardType="numeric"
                            onChangeText={value =>
                              vm.updateMaterial(
                                index,
                                'quantity',
                                Number(value || 0),
                              )
                            }
                          />
                        </View>

                        <View style={styles.rowItem}>
                          <AddWorkOrderField
                            label="Magasin"
                            icon="map-pin"
                            value={material.location || ''}
                            autoCapitalize="characters"
                            onChangeText={value =>
                              vm.updateMaterial(index, 'location', value)
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ),
                )}

                <TouchableOpacity
                  onPress={vm.addMaterial}
                  activeOpacity={0.85}
                  style={styles.addLineButton}
                >
                  <FeatherIcon name="plus" size={15} color="#fff" />
                  <Text style={styles.addLineText}>Ajouter un matériel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </SectionCard>

          <SectionCard
            icon="users"
            title="Main-d’œuvre"
            subtitle="Ressources proposées par IA"
            right={
              <ToggleButton open={vm.showLabor} onPress={vm.toggleLabor} />
            }
          >
            {vm.showLabor ? (
              <>
                {(vm.workorder.planned_labor || []).map((labor, index) => (
                  <View key={`labor-${index}`} style={styles.subCard}>
                    <View style={styles.subHeader}>
                      <Text style={styles.subTitle}>
                        Main-d’œuvre {index + 1}
                      </Text>
                      <DeleteButton onPress={() => vm.removeLabor(index)} />
                    </View>

                    <SuggestionInput
                        label="Code main-d’œuvre"
                        icon="user"
                        value={labor.laborcode || ''}
                        onChangeText={value => vm.updateLabor(index, 'laborcode', value)}
                        search={searchLabor}
                        getLabel={item => item.laborcode}
                        getValue={item => item.laborcode}
                        getSubLabel={item => `Heures : ${item.laborhrs || 1}`}
                        onSelect={item => {
                          vm.updateLabor(index, 'laborcode', item.laborcode);
                          vm.updateLabor(index, 'laborhrs', Number(item.laborhrs || 1));
                          vm.updateLabor(index, 'quantity', Number(item.quantity || 1));
                        }}
                      />

                    <View style={styles.row}>
                      <View style={styles.rowItem}>
                        <AddWorkOrderField
                          label="Heures"
                          icon="clock"
                          value={labor.laborhrs ?? ''}
                          keyboardType="numeric"
                          onChangeText={value =>
                            vm.updateLabor(
                              index,
                              'laborhrs',
                              Number(value || 0),
                            )
                          }
                        />
                      </View>

                      <View style={styles.rowItem}>
                        <AddWorkOrderField
                          label="Quantité"
                          icon="hash"
                          value={labor.quantity ?? ''}
                          keyboardType="numeric"
                          onChangeText={value =>
                            vm.updateLabor(
                              index,
                              'quantity',
                              Number(value || 0),
                            )
                          }
                        />
                      </View>
                    </View>
                  </View>
                ))}

                <TouchableOpacity
                  onPress={vm.addLabor}
                  activeOpacity={0.85}
                  style={styles.addLineButton}
                >
                  <FeatherIcon name="plus" size={15} color="#fff" />
                  <Text style={styles.addLineText}>
                    Ajouter une main-d’œuvre
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </SectionCard>
        </ScrollView>
      </AddEntityScreenLayout>

      <Modal
        visible={vm.aiModalVisible}
        transparent
        animationType="fade"
        onRequestClose={vm.closeAiModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.aiModal}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcon}>
                <FeatherIcon name="cpu" size={16} color="#fff" />
              </View>

              <View style={styles.modalTitleWrap}>
                <Text style={styles.aiModalTitle}>Générer avec IA</Text>
                <Text style={styles.aiModalHint}>
                  Écrire ou dicter la demande du technicien.
                </Text>
              </View>

              <TouchableOpacity
                onPress={vm.closeAiModal}
                disabled={vm.aiLoading || vm.aiVoiceLoading}
                style={styles.closeButton}
              >
                <FeatherIcon name="x" size={16} color={UI.sub} />
              </TouchableOpacity>
            </View>

            <AddWorkOrderField
              label="Demande"
              icon="message-circle"
              value={vm.aiRequestText}
              autoHeight
              minHeight={42}
              maxHeight={130}
              onChangeText={vm.setAiRequestText}
            />

            {vm.aiInfo ? (
              <View style={styles.infoBox}>
                <FeatherIcon
                  name={vm.aiError ? 'x-circle' : 'check-circle'}
                  size={13}
                  color={vm.aiError ? colors.danger : colors.success}
                />

                <Text
                  style={[
                    styles.infoText,
                    vm.aiError && styles.infoTextError,
                  ]}
                >
                  {vm.aiInfo}
                </Text>
              </View>
            ) : null}

            <View style={styles.aiActions}>
              <TouchableOpacity
                onPress={handleAiVoicePress}
                disabled={vm.aiVoiceLoading || vm.aiLoading}
                activeOpacity={0.88}
                style={[
                  styles.aiActionButton,
                  vm.aiRecording && styles.aiActionButtonDanger,
                  (vm.aiVoiceLoading || vm.aiLoading) && styles.buttonDisabled,
                ]}
              >
                {vm.aiVoiceLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FeatherIcon
                    name={vm.aiRecording ? 'square' : 'mic'}
                    size={16}
                    color="#fff"
                  />
                )}

                <Text style={styles.aiButtonText}>
                  {vm.aiRecording ? 'Arrêter' : 'Dicter'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={vm.generateWithAI}
                disabled={vm.aiLoading || !vm.aiRequestText.trim()}
                activeOpacity={0.88}
                style={[
                  styles.aiActionButton,
                  styles.aiActionButtonGreen,
                  (vm.aiLoading || !vm.aiRequestText.trim()) &&
                    styles.buttonDisabled,
                ]}
              >
                {vm.aiLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FeatherIcon name="zap" size={16} color="#fff" />
                )}

                <Text style={styles.aiButtonText}>Générer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomCalendar
        visible={Boolean(dateField)}
        selectedDate={selectedDate}
        onConfirm={onDateConfirm}
        onCancel={closeDatePicker}
      />

      <CustomTimePicker
        visible={Boolean(timeField)}
        selectedDate={selectedDate || new Date()}
        onConfirm={onTimeConfirm}
        onCancel={closeTimePicker}
      />

      <AppPermissionsModal
        visible={permissionsVM.visible}
        mode={permissionsVM.mode}
        blockedCamera={permissionsVM.blockedCamera}
        blockedMicrophone={permissionsVM.blockedMicrophone}
        onConfirm={permissionsVM.confirmSelection}
        onLater={permissionsVM.closeModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 18,
    gap: 10,
  },

  aiBox: {
    backgroundColor: UI.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  aiTextWrap: {
    flex: 1,
  },

  aiTitle: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },

  aiSubtitle: {
    color: UI.sub,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  aiOpenButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionCard: {
    backgroundColor: UI.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#12214a',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitleWrap: {
    flex: 1,
  },

  sectionTitle: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '900',
  },

  sectionSubtitle: {
    color: UI.sub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    gap: 10,
  },

  rowItem: {
    flex: 1,
  },

  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subCard: {
    backgroundColor: UI.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: UI.borderAlt,
    padding: 10,
    marginTop: 10,
  },

  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  subTitle: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '900',
  },

  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: UI.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.borderAlt,
  },

  addLineButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  addLineText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  aiModal: {
    width: '100%',
    backgroundColor: UI.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: UI.border,
    padding: 14,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  modalIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalTitleWrap: {
    flex: 1,
  },

  aiModalTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '900',
  },

  aiModalHint: {
    marginTop: 2,
    color: UI.sub,
    fontSize: 11,
    fontWeight: '600',
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: UI.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBox: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  infoText: {
    flex: 1,
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },

  infoTextError: {
    color: colors.danger,
  },

  aiActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  aiActionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  aiActionButtonDanger: {
    backgroundColor: colors.danger,
  },

  aiActionButtonGreen: {
    backgroundColor: colors.success,
  },

  aiButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  buttonDisabled: {
    opacity: 0.55,
  },
});