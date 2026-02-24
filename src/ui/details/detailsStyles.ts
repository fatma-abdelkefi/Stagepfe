import { StyleSheet } from 'react-native';

export const detailsStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // ✅ header keys already used by DetailsHeader.tsx
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#3b82f6',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSpacer: { width: 44, height: 44 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginTop: 2,
  },

  // ✅ shared content padding
  content: { flex: 1, padding: 16 },
  listContainer: { paddingBottom: 24 },

  sectionInfo: { fontSize: 15, fontWeight: '600', color: '#64748b', marginBottom: 16 },

  // ✅ shared card design (same as activities)
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#3b82f6', marginTop: 4, fontWeight: '600' },
  description: { fontSize: 15, color: '#334155', lineHeight: 22 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#64748b', fontWeight: '700' },
  value: { color: '#0f172a', fontWeight: '800' },

  // ✅ shared empty state
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'center',
  },

  // ✅ optional shared button style if you want consistent action buttons
  actionBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});