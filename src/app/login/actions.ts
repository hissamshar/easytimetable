'use server'

import pool from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import bcrypt from 'bcryptjs'

export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  // Extract the part before @
  const prefix = email.split('@')[0].toLowerCase()
  
  // Extract all letters and digits from the prefix
  const letters = prefix.replace(/[^a-z]/g, '')
  const digits = prefix.replace(/[^0-9]/g, '')
  
  if (digits.length < 6 || letters.length === 0) {
    return { error: 'Invalid academic email. Must contain batch year, campus letter, and ID.' }
  }

  const batch = digits.substring(0, 2)
  const id = digits.substring(digits.length - 4)
  const letter = letters[0].toUpperCase()
  
  const rollWithHyphen = `${batch}${letter}-${id}`
  const rollWithoutHyphen = `${batch}${letter}${id}`

  try {
    const res = await pool.query(
      'SELECT * FROM students WHERE UPPER(roll_number) = $1 OR UPPER(roll_number) = $2 OR REPLACE(UPPER(roll_number), \'-\', \'\') = $2', 
      [rollWithHyphen, rollWithoutHyphen]
    )
    if (res.rows.length === 0) {
      return { error: 'No student found with this academic email' }
    }

    const student = res.rows[0]

    if (!student.password_hash) {
      return { error: 'Your account has not been set up. Please sign up first.' }
    }

    const isMatch = await bcrypt.compare(password, student.password_hash)
    if (!isMatch) {
      return { error: 'Incorrect password' }
    }
    
    const sessionData = JSON.stringify({
      id: student.student_id,
      roll: student.roll_number,
      name: student.name,
      program: student.program,
      batch: student.batch_year,
      section: student.section,
    })
    
    const cookieStore = await cookies()
    
    // httpOnly cookie for server-side auth check
    cookieStore.set('auth', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })
    
    // Readable cookie for client-side user display (name/roll only)
    cookieStore.set('user_info', JSON.stringify({
      name: student.name,
      roll: student.roll_number,
      program: student.program,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

  } catch (err) {
    console.error(err)
    return { error: 'Database error occurred' }
  }

  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete('auth')
  cookieStore.delete('user_info')
  redirect('/login')
}
