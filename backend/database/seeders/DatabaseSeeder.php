<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\Major;
use App\Models\ClassRoom;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $guruRole = Role::firstOrCreate(['name' => 'guru']);
        $siswaRole = Role::firstOrCreate(['name' => 'siswa']);
        $pengawasRole = Role::firstOrCreate(['name' => 'pengawas']);

        // Create some dummy majors and classes for reference
        $major = Major::firstOrCreate(
            ['code' => 'RPL'],
            ['name' => 'Rekayasa Perangkat Lunak']
        );

        $class = ClassRoom::firstOrCreate(
            ['name' => 'XII RPL 1'],
            ['level' => 12, 'major_id' => $major->id]
        );

        // 1. Super Admin User
        $superAdmin = User::firstOrCreate(
            ['email' => 'admin@cbt.com'],
            [
                'name' => 'Super Admin',
                'username' => 'admin',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $superAdmin->syncRoles(['super_admin', 'admin']);
        $superAdmin->update(['password' => bcrypt('password'), 'is_active' => true]);

        // 2. Teacher User: Budi Santoso
        $teacherUser = User::firstOrCreate(
            ['email' => 'budi@cbt.com'],
            [
                'name' => 'Budi Santoso, S.Pd.',
                'username' => 'budi',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $teacherUser->syncRoles(['guru']);
        $teacherUser->update(['password' => bcrypt('password'), 'is_active' => true]);
        Teacher::firstOrCreate(
            ['user_id' => $teacherUser->id],
            ['nip' => '198501012010011002']
        );

        // 3. Teacher User: Guru Simulasi
        $teacherSimUser = User::firstOrCreate(
            ['email' => 'guru.simulasi@cbt.com'],
            [
                'name' => 'Guru Simulasi',
                'username' => 'guru.simulasi',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $teacherSimUser->syncRoles(['guru']);
        $teacherSimUser->update(['password' => bcrypt('password'), 'is_active' => true]);
        Teacher::firstOrCreate(
            ['user_id' => $teacherSimUser->id],
            ['nip' => '199001012015011001']
        );

        // 4. Student User: Izul Fitra
        $studentUser = User::firstOrCreate(
            ['email' => 'izul@cbt.com'],
            [
                'name' => 'Izul Fitra',
                'username' => '1234567890',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $studentUser->syncRoles(['siswa']);
        $studentUser->update(['password' => bcrypt('password'), 'is_active' => true]);
        Student::firstOrCreate(
            ['user_id' => $studentUser->id],
            [
                'nisn' => '1234567890',
                'nis' => '1001',
                'class_id' => $class->id,
                'major_id' => $major->id,
            ]
        );

        // 5. Student User: Siswa 1
        $siswa1User = User::firstOrCreate(
            ['email' => 'siswa1@cbt.com'],
            [
                'name' => 'Siswa 1',
                'username' => 'siswa1',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $siswa1User->syncRoles(['siswa']);
        $siswa1User->update(['password' => bcrypt('password'), 'is_active' => true]);
        Student::firstOrCreate(
            ['user_id' => $siswa1User->id],
            [
                'nisn' => '1122334455',
                'nis' => '1002',
                'class_id' => $class->id,
                'major_id' => $major->id,
            ]
        );

        // 6. Student User: Siswa Simulasi
        $siswaSimUser = User::firstOrCreate(
            ['email' => 'siswa.simulasi@cbt.com'],
            [
                'name' => 'Siswa Peserta Simulasi',
                'username' => 'siswa.simulasi',
                'password' => bcrypt('password'),
                'is_active' => true,
            ]
        );
        $siswaSimUser->syncRoles(['siswa']);
        $siswaSimUser->update(['password' => bcrypt('password'), 'is_active' => true]);
        Student::firstOrCreate(
            ['user_id' => $siswaSimUser->id],
            [
                'nisn' => '9988776655',
                'nis' => '1003',
                'class_id' => $class->id,
                'major_id' => $major->id,
            ]
        );
    }
}
