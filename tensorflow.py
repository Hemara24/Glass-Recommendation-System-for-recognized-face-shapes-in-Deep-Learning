import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

class MultiTaskFaceClassifier(keras.Model):
    def __init__(self, num_shape_classes=5, num_gender_classes=2, num_age_classes=3):
        super(MultiTaskFaceClassifier, self).__init__()
        
        # Shared Feature Extractor
        self.base_model = keras.applications.MobileNetV2(
            input_shape=(224, 224, 3),
            include_top=False,
            weights='imagenet'
        )
        self.base_model.trainable = True
        
        # Global Average Pooling
        self.global_avg_pool = layers.GlobalAveragePooling2D()
        self.dropout = layers.Dropout(0.5)
        
        # Task-specific heads
        # Face Shape Head
        self.shape_dense1 = layers.Dense(128, activation='relu')
        self.shape_dense2 = layers.Dense(64, activation='relu')
        self.shape_output = layers.Dense(num_shape_classes, 
                                        activation='softmax',
                                        name='face_shape')
        
        # Gender Head
        self.gender_dense1 = layers.Dense(64, activation='relu')
        self.gender_output = layers.Dense(num_gender_classes, 
                                         activation='sigmoid',
                                         name='gender')
        
        # Age Group Head
        self.age_dense1 = layers.Dense(64, activation='relu')
        self.age_output = layers.Dense(num_age_classes, 
                                      activation='softmax',
                                      name='age_group')
    
    def call(self, inputs, training=False):
        # Shared feature extraction
        x = self.base_model(inputs, training=training)
        x = self.global_avg_pool(x)
        x = self.dropout(x, training=training)
        
        # Task-specific heads
        shape_features = self.shape_dense1(x)
        shape_features = self.shape_dense2(shape_features)
        shape_output = self.shape_output(shape_features)
        
        gender_features = self.gender_dense1(x)
        gender_output = self.gender_output(gender_features)
        
        age_features = self.age_dense1(x)
        age_output = self.age_output(age_features)
        
        return {
            'face_shape': shape_output,
            'gender': gender_output,
            'age_group': age_output
        }
    
    def compile(self, optimizer, 
                shape_weight=1.0, gender_weight=1.0, age_weight=1.0):
        super(MultiTaskFaceClassifier, self).compile()
        self.optimizer = optimizer
        self.shape_weight = shape_weight
        self.gender_weight = gender_weight
        self.age_weight = age_weight
        
        # Loss functions for each task
        self.shape_loss_fn = keras.losses.CategoricalCrossentropy()
        self.gender_loss_fn = keras.losses.BinaryCrossentropy()
        self.age_loss_fn = keras.losses.CategoricalCrossentropy()
        
        # Metrics
        self.shape_acc_metric = keras.metrics.CategoricalAccuracy(name='shape_acc')
        self.gender_acc_metric = keras.metrics.BinaryAccuracy(name='gender_acc')
        self.age_acc_metric = keras.metrics.CategoricalAccuracy(name='age_acc')
    
    def train_step(self, data):
        images, labels = data
        shape_labels, gender_labels, age_labels = labels
        
        with tf.GradientTape() as tape:
            # Forward pass
            predictions = self(images, training=True)
            
            # Calculate losses
            shape_loss = self.shape_loss_fn(shape_labels, predictions['face_shape'])
            gender_loss = self.gender_loss_fn(gender_labels, predictions['gender'])
            age_loss = self.age_loss_fn(age_labels, predictions['age_group'])
            
            # Weighted total loss
            total_loss = (self.shape_weight * shape_loss + 
                         self.gender_weight * gender_loss + 
                         self.age_weight * age_loss)
        
        # Compute gradients
        gradients = tape.gradient(total_loss, self.trainable_variables)
        
        # Update weights
        self.optimizer.apply_gradients(zip(gradients, self.trainable_variables))
        
        # Update metrics
        self.shape_acc_metric.update_state(shape_labels, predictions['face_shape'])
        self.gender_acc_metric.update_state(gender_labels, predictions['gender'])
        self.age_acc_metric.update_state(age_labels, predictions['age_group'])
        
        return {
            'loss': total_loss,
            'shape_loss': shape_loss,
            'gender_loss': gender_loss,
            'age_loss': age_loss,
            'shape_acc': self.shape_acc_metric.result(),
            'gender_acc': self.gender_acc_metric.result(),
            'age_acc': self.age_acc_metric.result()
        }