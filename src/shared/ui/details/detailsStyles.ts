import { StyleSheet } from 'react-native';

export const detailsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  sectionInfo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'center',
  },
});