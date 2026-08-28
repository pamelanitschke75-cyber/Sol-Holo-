package com.solholo.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.health.connect.HealthConnectException;
import android.health.connect.HealthConnectManager;
import android.health.connect.ReadRecordsRequestUsingFilters;
import android.health.connect.ReadRecordsResponse;
import android.health.connect.TimeInstantRangeFilter;
import android.health.connect.datatypes.Record;
import android.os.Build;
import android.os.OutcomeReceiver;

import androidx.annotation.RequiresApi;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.time.Instant;
import java.time.temporal.TemporalAccessor;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

@CapacitorPlugin(name = "HealthConnect")
public class HealthConnectPlugin extends Plugin {
    private static final String PERMISSION_PREFIX =
        "android.permission.health.";
    private static final int MAX_DAYS = 30;
    private static final int MAX_RECORDS_PER_TYPE = 3;

    private static final class PermissionSpec {
        final String name;
        final String label;
        final int minApi;

        PermissionSpec(String name, String label, int minApi) {
            this.name = PERMISSION_PREFIX + name;
            this.label = label;
            this.minApi = minApi;
        }
    }

    private static final class RecordSpec {
        final String group;
        final String label;
        final String permission;
        final String className;
        final int minApi;

        RecordSpec(
            String group,
            String label,
            String permission,
            String className,
            int minApi
        ) {
            this.group = group;
            this.label = label;
            this.permission = PERMISSION_PREFIX + permission;
            this.className =
                "android.health.connect.datatypes." + className;
            this.minApi = minApi;
        }
    }

    private static final PermissionSpec[] PERMISSIONS = {
        new PermissionSpec("READ_ACTIVE_CALORIES_BURNED", "Aktive Kalorien", 34),
        new PermissionSpec("READ_BASAL_BODY_TEMPERATURE", "Basaltemperatur", 34),
        new PermissionSpec("READ_BASAL_METABOLIC_RATE", "Grundumsatz", 34),
        new PermissionSpec("READ_BLOOD_GLUCOSE", "Blutzucker", 34),
        new PermissionSpec("READ_BLOOD_PRESSURE", "Blutdruck", 34),
        new PermissionSpec("READ_BODY_FAT", "Körperfett", 34),
        new PermissionSpec("READ_BODY_TEMPERATURE", "Körpertemperatur", 34),
        new PermissionSpec("READ_BODY_WATER_MASS", "Körperwasser", 34),
        new PermissionSpec("READ_BONE_MASS", "Knochenmasse", 34),
        new PermissionSpec("READ_CERVICAL_MUCUS", "Zervixschleim", 34),
        new PermissionSpec("READ_CYCLING_PEDALING_CADENCE", "Trittfrequenz", 34),
        new PermissionSpec("READ_DISTANCE", "Distanz", 34),
        new PermissionSpec("READ_ELEVATION_GAINED", "Höhenmeter", 34),
        new PermissionSpec("READ_EXERCISE", "Training", 34),
        new PermissionSpec("READ_FLOORS_CLIMBED", "Etagen", 34),
        new PermissionSpec("READ_HEART_RATE", "Herzfrequenz", 34),
        new PermissionSpec("READ_HEART_RATE_VARIABILITY", "Herzfrequenzvariabilität", 34),
        new PermissionSpec("READ_HEIGHT", "Größe", 34),
        new PermissionSpec("READ_HYDRATION", "Flüssigkeitszufuhr", 34),
        new PermissionSpec("READ_INTERMENSTRUAL_BLEEDING", "Zwischenblutung", 34),
        new PermissionSpec("READ_LEAN_BODY_MASS", "Fettfreie Masse", 34),
        new PermissionSpec("READ_MENSTRUATION", "Menstruation", 34),
        new PermissionSpec("READ_NUTRITION", "Ernährung", 34),
        new PermissionSpec("READ_OVULATION_TEST", "Ovulationstest", 34),
        new PermissionSpec("READ_OXYGEN_SATURATION", "Sauerstoffsättigung", 34),
        new PermissionSpec("READ_PLANNED_EXERCISE", "Trainingsplan", 35),
        new PermissionSpec("READ_POWER", "Leistung", 34),
        new PermissionSpec("READ_RESPIRATORY_RATE", "Atemfrequenz", 34),
        new PermissionSpec("READ_RESTING_HEART_RATE", "Ruhepuls", 34),
        new PermissionSpec("READ_SEXUAL_ACTIVITY", "Sexuelle Aktivität", 34),
        new PermissionSpec("READ_SKIN_TEMPERATURE", "Hauttemperatur", 35),
        new PermissionSpec("READ_SLEEP", "Schlaf", 34),
        new PermissionSpec("READ_SPEED", "Geschwindigkeit", 34),
        new PermissionSpec("READ_STEPS", "Schritte", 34),
        new PermissionSpec("READ_TOTAL_CALORIES_BURNED", "Gesamtkalorien", 34),
        new PermissionSpec("READ_VO2_MAX", "VO₂max", 34),
        new PermissionSpec("READ_WEIGHT", "Gewicht", 34),
        new PermissionSpec("READ_WHEELCHAIR_PUSHES", "Rollstuhlschübe", 34)
    };

    private static final RecordSpec[] RECORDS = {
        new RecordSpec("activity", "Aktive Kalorien", "READ_ACTIVE_CALORIES_BURNED", "ActiveCaloriesBurnedRecord", 34),
        new RecordSpec("vitals", "Basaltemperatur", "READ_BASAL_BODY_TEMPERATURE", "BasalBodyTemperatureRecord", 34),
        new RecordSpec("body", "Grundumsatz", "READ_BASAL_METABOLIC_RATE", "BasalMetabolicRateRecord", 34),
        new RecordSpec("vitals", "Blutzucker", "READ_BLOOD_GLUCOSE", "BloodGlucoseRecord", 34),
        new RecordSpec("vitals", "Blutdruck", "READ_BLOOD_PRESSURE", "BloodPressureRecord", 34),
        new RecordSpec("body", "Körperfett", "READ_BODY_FAT", "BodyFatRecord", 34),
        new RecordSpec("vitals", "Körpertemperatur", "READ_BODY_TEMPERATURE", "BodyTemperatureRecord", 34),
        new RecordSpec("body", "Körperwasser", "READ_BODY_WATER_MASS", "BodyWaterMassRecord", 34),
        new RecordSpec("body", "Knochenmasse", "READ_BONE_MASS", "BoneMassRecord", 34),
        new RecordSpec("reproductive", "Zervixschleim", "READ_CERVICAL_MUCUS", "CervicalMucusRecord", 34),
        new RecordSpec("activity", "Trittfrequenz", "READ_CYCLING_PEDALING_CADENCE", "CyclingPedalingCadenceRecord", 34),
        new RecordSpec("activity", "Distanz", "READ_DISTANCE", "DistanceRecord", 34),
        new RecordSpec("activity", "Höhenmeter", "READ_ELEVATION_GAINED", "ElevationGainedRecord", 34),
        new RecordSpec("activity", "Training", "READ_EXERCISE", "ExerciseSessionRecord", 34),
        new RecordSpec("activity", "Etagen", "READ_FLOORS_CLIMBED", "FloorsClimbedRecord", 34),
        new RecordSpec("vitals", "Herzfrequenz", "READ_HEART_RATE", "HeartRateRecord", 34),
        new RecordSpec("vitals", "Herzfrequenzvariabilität", "READ_HEART_RATE_VARIABILITY", "HeartRateVariabilityRmssdRecord", 34),
        new RecordSpec("body", "Größe", "READ_HEIGHT", "HeightRecord", 34),
        new RecordSpec("nutrition", "Flüssigkeitszufuhr", "READ_HYDRATION", "HydrationRecord", 34),
        new RecordSpec("reproductive", "Zwischenblutung", "READ_INTERMENSTRUAL_BLEEDING", "IntermenstrualBleedingRecord", 34),
        new RecordSpec("body", "Fettfreie Masse", "READ_LEAN_BODY_MASS", "LeanBodyMassRecord", 34),
        new RecordSpec("reproductive", "Menstruationsfluss", "READ_MENSTRUATION", "MenstruationFlowRecord", 34),
        new RecordSpec("reproductive", "Menstruationszeitraum", "READ_MENSTRUATION", "MenstruationPeriodRecord", 34),
        new RecordSpec("nutrition", "Ernährung", "READ_NUTRITION", "NutritionRecord", 34),
        new RecordSpec("reproductive", "Ovulationstest", "READ_OVULATION_TEST", "OvulationTestRecord", 34),
        new RecordSpec("vitals", "Sauerstoffsättigung", "READ_OXYGEN_SATURATION", "OxygenSaturationRecord", 34),
        new RecordSpec("activity", "Trainingsplan", "READ_PLANNED_EXERCISE", "PlannedExerciseSessionRecord", 35),
        new RecordSpec("activity", "Leistung", "READ_POWER", "PowerRecord", 34),
        new RecordSpec("vitals", "Atemfrequenz", "READ_RESPIRATORY_RATE", "RespiratoryRateRecord", 34),
        new RecordSpec("vitals", "Ruhepuls", "READ_RESTING_HEART_RATE", "RestingHeartRateRecord", 34),
        new RecordSpec("reproductive", "Sexuelle Aktivität", "READ_SEXUAL_ACTIVITY", "SexualActivityRecord", 34),
        new RecordSpec("vitals", "Hauttemperatur", "READ_SKIN_TEMPERATURE", "SkinTemperatureRecord", 35),
        new RecordSpec("sleep", "Schlaf", "READ_SLEEP", "SleepSessionRecord", 34),
        new RecordSpec("activity", "Geschwindigkeit", "READ_SPEED", "SpeedRecord", 34),
        new RecordSpec("activity", "Schritte", "READ_STEPS", "StepsRecord", 34),
        new RecordSpec("activity", "Gesamtkalorien", "READ_TOTAL_CALORIES_BURNED", "TotalCaloriesBurnedRecord", 34),
        new RecordSpec("vitals", "VO₂max", "READ_VO2_MAX", "Vo2MaxRecord", 34),
        new RecordSpec("body", "Gewicht", "READ_WEIGHT", "WeightRecord", 34),
        new RecordSpec("activity", "Rollstuhlschübe", "READ_WHEELCHAIR_PUSHES", "WheelchairPushesRecord", 34)
    };

    private boolean supported() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return false;
        }
        return getContext().getSystemService(HealthConnectManager.class) != null;
    }

    private boolean granted(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission)
            == PackageManager.PERMISSION_GRANTED;
    }

    private JSObject status() {
        JSObject result = new JSObject();
        JSArray grantedCategories = new JSArray();
        int availableCount = 0;
        int grantedCount = 0;

        for (PermissionSpec permission : PERMISSIONS) {
            if (Build.VERSION.SDK_INT < permission.minApi) {
                continue;
            }
            availableCount += 1;
            if (granted(permission.name)) {
                grantedCount += 1;
                grantedCategories.put(permission.label);
            }
        }

        result.put("supported", supported());
        result.put("readOnly", true);
        result.put("backgroundAccess", false);
        result.put("availablePermissionCount", availableCount);
        result.put("grantedPermissionCount", grantedCount);
        result.put("connected", grantedCount > 0);
        result.put(
            "allGranted",
            availableCount > 0 && grantedCount == availableCount
        );
        result.put("grantedCategories", grantedCategories);
        return result;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    @PluginMethod
    public void openPermissions(PluginCall call) {
        if (!supported()) {
            call.reject(
                "Health Connect ist auf diesem Gerät erst ab Android 14 verfügbar.",
                "HEALTH_CONNECT_UNAVAILABLE"
            );
            return;
        }

        try {
            Intent intent = new Intent(
                HealthConnectManager.ACTION_MANAGE_HEALTH_PERMISSIONS
            );
            intent.putExtra(
                Intent.EXTRA_PACKAGE_NAME,
                getContext().getPackageName()
            );
            getActivity().startActivity(intent);
            call.resolve(status());
        } catch (ActivityNotFoundException | NullPointerException error) {
            call.reject(
                "Die Health-Connect-Freigaben konnten nicht geöffnet werden.",
                "HEALTH_CONNECT_SETTINGS_UNAVAILABLE",
                error
            );
        }
    }

    @PluginMethod
    public void readSnapshot(PluginCall call) {
        if (!supported()) {
            call.reject(
                "Health Connect ist auf diesem Gerät nicht verfügbar.",
                "HEALTH_CONNECT_UNAVAILABLE"
            );
            return;
        }

        Integer requestedDays = call.getInt("days", 7);
        int days = Math.max(
            1,
            Math.min(MAX_DAYS, requestedDays == null ? 7 : requestedDays)
        );
        String group = call.getString("category", "all")
            .trim()
            .toLowerCase(Locale.ROOT);

        if (!isKnownGroup(group)) {
            group = "all";
        }

        readSnapshotOnAndroid14(call, days, group);
    }

    private boolean isKnownGroup(String group) {
        return group.equals("all")
            || group.equals("activity")
            || group.equals("body")
            || group.equals("vitals")
            || group.equals("sleep")
            || group.equals("nutrition")
            || group.equals("reproductive");
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private void readSnapshotOnAndroid14(
        PluginCall call,
        int days,
        String group
    ) {
        HealthConnectManager manager = getContext()
            .getSystemService(HealthConnectManager.class);
        if (manager == null) {
            call.reject(
                "Health Connect ist auf diesem Gerät nicht verfügbar.",
                "HEALTH_CONNECT_UNAVAILABLE"
            );
            return;
        }

        List<RecordSpec> readableSpecs = new ArrayList<>();
        for (RecordSpec spec : RECORDS) {
            if (
                Build.VERSION.SDK_INT >= spec.minApi
                    && (group.equals("all") || group.equals(spec.group))
                    && granted(spec.permission)
            ) {
                readableSpecs.add(spec);
            }
        }

        if (readableSpecs.isEmpty()) {
            call.reject(
                "Für diesen Health-Bereich fehlt noch die sichtbare Android-Freigabe.",
                "HEALTH_PERMISSION_REQUIRED"
            );
            return;
        }

        Instant end = Instant.now();
        Instant start = end.minusSeconds(days * 24L * 60L * 60L);
        TimeInstantRangeFilter timeFilter =
            new TimeInstantRangeFilter.Builder()
                .setStartTime(start)
                .setEndTime(end)
                .build();

        JSArray categories = new JSArray();
        AtomicInteger remaining = new AtomicInteger(readableSpecs.size());
        AtomicInteger checked = new AtomicInteger(0);
        AtomicInteger errors = new AtomicInteger(0);

        for (RecordSpec spec : readableSpecs) {
            try {
                Class<?> candidate = Class.forName(spec.className);
                if (!Record.class.isAssignableFrom(candidate)) {
                    finishRead(
                        call,
                        days,
                        group,
                        categories,
                        remaining,
                        checked,
                        errors,
                        null,
                        true
                    );
                    continue;
                }

                @SuppressWarnings("unchecked")
                Class<? extends Record> recordClass =
                    (Class<? extends Record>) candidate;

                readRecordType(
                    manager,
                    spec,
                    recordClass,
                    timeFilter,
                    category -> finishRead(
                        call,
                        days,
                        group,
                        categories,
                        remaining,
                        checked,
                        errors,
                        category,
                        false
                    ),
                    errorCategory -> finishRead(
                        call,
                        days,
                        group,
                        categories,
                        remaining,
                        checked,
                        errors,
                        errorCategory,
                        true
                    )
                );
            } catch (ClassNotFoundException error) {
                finishRead(
                    call,
                    days,
                    group,
                    categories,
                    remaining,
                    checked,
                    errors,
                    null,
                    true
                );
            }
        }
    }

    private interface CategoryCallback {
        void complete(JSObject category);
    }

    @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private <T extends Record> void readRecordType(
        HealthConnectManager manager,
        RecordSpec spec,
        Class<T> recordClass,
        TimeInstantRangeFilter timeFilter,
        CategoryCallback success,
        CategoryCallback failure
    ) {
        ReadRecordsRequestUsingFilters<T> request =
            new ReadRecordsRequestUsingFilters.Builder<>(recordClass)
                .setTimeRangeFilter(timeFilter)
                .setPageSize(MAX_RECORDS_PER_TYPE)
                .setAscending(false)
                .build();

        try {
            manager.readRecords(
                request,
                getContext().getMainExecutor(),
                new OutcomeReceiver<ReadRecordsResponse<T>, HealthConnectException>() {
                    @Override
                    public void onResult(ReadRecordsResponse<T> response) {
                        JSObject category = new JSObject();
                        JSArray records = new JSArray();
                        List<T> returnedRecords = response.getRecords();

                        for (T record : returnedRecords) {
                            records.put(describeObject(record, 0));
                        }

                        category.put("group", spec.group);
                        category.put("label", spec.label);
                        category.put("recordType", recordClass.getSimpleName());
                        category.put("count", returnedRecords.size());
                        category.put("records", records);
                        success.complete(category);
                    }

                    @Override
                    public void onError(HealthConnectException error) {
                        JSObject category = new JSObject();
                        category.put("group", spec.group);
                        category.put("label", spec.label);
                        category.put("recordType", recordClass.getSimpleName());
                        category.put("count", 0);
                        category.put("unavailable", true);
                        failure.complete(category);
                    }
                }
            );
        } catch (RuntimeException error) {
            JSObject category = new JSObject();
            category.put("group", spec.group);
            category.put("label", spec.label);
            category.put("recordType", recordClass.getSimpleName());
            category.put("count", 0);
            category.put("unavailable", true);
            failure.complete(category);
        }
    }

    private void finishRead(
        PluginCall call,
        int days,
        String group,
        JSArray categories,
        AtomicInteger remaining,
        AtomicInteger checked,
        AtomicInteger errors,
        JSObject category,
        boolean failed
    ) {
        checked.incrementAndGet();
        if (failed) {
            errors.incrementAndGet();
        }
        if (category != null && category.optInt("count", 0) > 0) {
            categories.put(category);
        }

        if (remaining.decrementAndGet() != 0) {
            return;
        }

        JSObject result = status();
        result.put("days", days);
        result.put("category", group);
        result.put("generatedAt", Instant.now().toString());
        result.put("checkedRecordTypeCount", checked.get());
        result.put("unavailableRecordTypeCount", errors.get());
        result.put("dataCategoryCount", categories.length());
        result.put("categories", categories);
        result.put("automaticallyStored", false);
        call.resolve(result);
    }

    private JSObject describeObject(Object value, int depth) {
        JSObject result = new JSObject();
        if (value == null || depth > 2) {
            return result;
        }

        Method[] methods = value.getClass().getMethods();
        int propertyCount = 0;
        Set<String> usedNames = new LinkedHashSet<>();

        for (Method method : methods) {
            if (
                !Modifier.isPublic(method.getModifiers())
                    || method.getParameterTypes().length != 0
                    || method.getReturnType() == Void.TYPE
            ) {
                continue;
            }

            String methodName = method.getName();
            if (
                methodName.equals("getClass")
                    || methodName.equals("getMetadata")
                    || methodName.toLowerCase(Locale.ROOT).contains("route")
            ) {
                continue;
            }

            String propertyName = propertyName(methodName);
            if (propertyName == null || usedNames.contains(propertyName)) {
                continue;
            }

            try {
                Object propertyValue = method.invoke(value);
                Object safeValue = safeValue(propertyValue, depth + 1);
                if (safeValue != null) {
                    result.put(propertyName, safeValue);
                    usedNames.add(propertyName);
                    propertyCount += 1;
                }
            } catch (ReflectiveOperationException | RuntimeException ignored) {
                // Ein einzelnes herstellerspezifisches Feld darf den Snapshot
                // nicht verhindern.
            }

            if (propertyCount >= 16) {
                break;
            }
        }

        return result;
    }

    private String propertyName(String methodName) {
        String raw;
        if (methodName.startsWith("get") && methodName.length() > 3) {
            raw = methodName.substring(3);
        } else if (methodName.startsWith("is") && methodName.length() > 2) {
            raw = methodName.substring(2);
        } else {
            return null;
        }

        return Character.toLowerCase(raw.charAt(0)) + raw.substring(1);
    }

    private Object safeValue(Object value, int depth) {
        if (value == null) {
            return null;
        }
        if (
            value instanceof Number
                || value instanceof Boolean
                || value instanceof CharSequence
        ) {
            return value;
        }
        if (value instanceof Enum<?> || value instanceof TemporalAccessor) {
            return value.toString();
        }
        if (value instanceof Collection<?>) {
            JSArray array = new JSArray();
            int itemCount = 0;
            for (Object item : (Collection<?>) value) {
                Object safeItem = safeValue(item, depth + 1);
                if (safeItem != null) {
                    array.put(safeItem);
                }
                itemCount += 1;
                if (itemCount >= 8) {
                    break;
                }
            }
            return array;
        }
        if (
            depth <= 2
                && value.getClass().getName().startsWith("android.health.connect")
        ) {
            return describeObject(value, depth);
        }

        String text = String.valueOf(value);
        return text.length() > 400 ? text.substring(0, 400) : text;
    }
}
