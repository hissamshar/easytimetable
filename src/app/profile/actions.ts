'use server'

import pool from '@/lib/db'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

async function getSession() {
  const cookieStore = await cookies()
  const auth = cookieStore.get('auth')
  if (!auth) return null
  try {
    return JSON.parse(auth.value)
  } catch {
    return null
  }
}

export async function updateProfile(formData: FormData) {
  const session = await getSession()
  if (!session) return { error: 'Not authenticated' }

  const newName = formData.get('name') as string
  const currentPassword = formData.get('currentPassword') as string
  const newPassword = formData.get('newPassword') as string

  if (!newName) {
    return { error: 'Name is required' }
  }

  try {
    // Check current password if trying to update password
    if (newPassword) {
      if (!currentPassword) {
        return { error: 'Current password is required to set a new password' }
      }
      
      const res = await pool.query('SELECT password_hash FROM students WHERE student_id = $1', [session.id])
      if (res.rows.length === 0) return { error: 'Student not found' }
      
      const student = res.rows[0]
      const isMatch = await bcrypt.compare(currentPassword, student.password_hash)
      
      if (!isMatch) {
        return { error: 'Incorrect current password' }
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(newPassword, salt)

      await pool.query(
        'UPDATE students SET name = $1, password_hash = $2 WHERE student_id = $3',
        [newName, hashedPassword, session.id]
      )
    } else {
      // Just updating the name
      await pool.query(
        'UPDATE students SET name = $1 WHERE student_id = $2',
        [newName, session.id]
      )
    }

    // Update the session and user_info cookies with the new name
    session.name = newName
    const cookieStore = await cookies()
    
    cookieStore.set('auth', JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    
    // Also update readable user_info cookie
    const userInfoCookie = cookieStore.get('user_info')
    if (userInfoCookie) {
      try {
        const userInfo = JSON.parse(userInfoCookie.value)
        userInfo.name = newName
        cookieStore.set('user_info', JSON.stringify(userInfo), {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7,
          path: '/'
        })
      } catch (e) {}
    }

    return { success: 'Profile updated successfully' }

  } catch (err) {
    console.error(err)
    return { error: 'Database error occurred' }
  }
}
