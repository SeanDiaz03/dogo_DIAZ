import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

let db = null;

export const setupDatabase = async () => {
  db = await SQLite.openDatabaseAsync('dogcenter.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      feedingTime TEXT
    );
    INSERT INTO dogs (name, feedingTime) VALUES ('Buddy', '08:00');
    INSERT INTO dogs (name, feedingTime) VALUES ('Max', '13:00');
    INSERT INTO dogs (name, feedingTime) VALUES ('Bella', '18:00');
  `);
};

export default function App() {
  const [text, setText] = useState('');
  const [feedingTime, setFeedingTime] = useState('');
  const [dogs, setDogs] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingFeedingTime, setEditingFeedingTime] = useState('');
  const [reminder, setReminder] = useState('');

  useEffect(() => {
    setupDatabase().then(fetchDogs);
  }, []);

  const fetchDogs = async () => {
    if (!db) return;
    const results = await db.getAllAsync('SELECT id, name, feedingTime FROM dogs;');
    setDogs(
      results.map((row) => ({
        id: row.id,
        name: row.name,
        feedingTime: row.feedingTime,
      }))
    );
  };

  useEffect(() => {
    const checkFeedingTime = () => {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const dogsToFeedNow = dogs.filter((dog) => dog.feedingTime === currentTime);
      if (dogsToFeedNow.length > 0) {
        const names = dogsToFeedNow.map((dog) => dog.name).join(', ');
        setReminder(`Time to feed: ${names}`);
      } else {
        setReminder('');
      }
    };

    checkFeedingTime();
    const interval = setInterval(checkFeedingTime, 60000);
    return () => clearInterval(interval);
  }, [dogs]);

  const addDog = async () => {
    if (!db || text.trim() === '' || feedingTime.trim() === '') {
      Alert.alert('Error', 'Please enter both dog name and feeding time.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(feedingTime.trim())) {
      Alert.alert('Invalid Time', 'Please enter feeding time in HH:mm format.');
      return;
    }
    await db.runAsync(
      'INSERT INTO dogs (name, feedingTime) VALUES (?, ?);',
      [text.trim(), feedingTime.trim()]
    );
    setText('');
    setFeedingTime('');
    fetchDogs();
  };

  const deleteDog = async (id) => {
    if (!db) return;
    await db.runAsync('DELETE FROM dogs WHERE id = ?;', [id]);
    fetchDogs();
  };

  const startEditing = (id, name, feedingTime) => {
    setEditingId(id);
    setEditingText(name);
    setEditingFeedingTime(feedingTime);
  };

  const saveEdit = async (id) => {
    if (!db || editingText.trim() === '' || editingFeedingTime.trim() === '') {
      Alert.alert('Error', 'Please enter both dog name and feeding time.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(editingFeedingTime.trim())) {
      Alert.alert('Invalid Time', 'Please enter feeding time in HH:mm format.');
      return;
    }
    await db.runAsync(
      'UPDATE dogs SET name = ?, feedingTime = ? WHERE id = ?;',
      [editingText.trim(), editingFeedingTime.trim(), id]
    );
    setEditingId(null);
    setEditingText('');
    setEditingFeedingTime('');
    fetchDogs();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🐾 Dog Center 🐾</Text>

      {reminder !== '' && (
        <View style={styles.reminderBox}>
          <Text style={styles.reminderText}>{reminder}</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          placeholder="Enter dog name"
          value={text}
          onChangeText={setText}
          style={[styles.input, { flex: 1 }]}
        />
        <TextInput
          placeholder="Feeding Time (HH:mm)"
          value={feedingTime}
          onChangeText={(val) => {
            if (val.length === 2 && !val.includes(':')) {
              setFeedingTime(val + ':');
            } else if (val.length <= 5) {
              setFeedingTime(val);
            }
          }}
          style={[styles.input, { flex: 0.5 }]}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addDog}>
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>🐶 Registered Dogs</Text>
      <FlatList
        data={dogs}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            {editingId === item.id ? (
              <>
                <TextInput
                  value={editingText}
                  onChangeText={setEditingText}
                  style={[styles.editInput, { flex: 1 }]}
                />
                <TextInput
                  value={editingFeedingTime}
                  onChangeText={(val) => {
                    if (val.length === 2 && !val.includes(':')) {
                      setEditingFeedingTime(val + ':');
                    } else if (val.length <= 5) {
                      setEditingFeedingTime(val);
                    }
                  }}
                  style={[styles.editInput, { flex: 0.6, marginLeft: 10 }]}
                  keyboardType="numeric"
                />
                <TouchableOpacity onPress={() => saveEdit(item.id)}>
                  <Text style={styles.save}>💾</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dogName}>{item.name}</Text>
                  <Text style={styles.feedingTime}>Feeding Time: {item.feedingTime}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => startEditing(item.id, item.name, item.feedingTime)}
                  >
                    <Text style={styles.edit}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteDog(item.id)}>
                    <Text style={styles.delete}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    marginTop: 60,
    backgroundColor: '#fff',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#2b2d42',
  },
  reminderBox: {
    backgroundColor: '#ffefc1',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  reminderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b55d00',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginTop: 30,
    marginBottom: 10,
    fontWeight: '600',
    color: '#444',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    borderColor: '#ccc',
    backgroundColor: '#f9f9f9',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#4e9f3d',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  dogName: {
    fontSize: 16,
  },
  feedingTime: {
    fontSize: 14,
    color: '#666',
  },
  editInput: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: '#bbb',
    backgroundColor: '#f2f2f2',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginLeft: 10,
  },
  edit: {
    fontSize: 18,
    marginRight: 10,
  },
  delete: {
    fontSize: 18,
    color: 'red',
  },
  save: {
    fontSize: 18,
    color: 'green',
    marginLeft: 10,
  },
});
