export default defineEventHandler(async () => {
  const db = useDbConnector()
  // const token = ''

  try {
    const data = await db.get('roly_config', { select: ['phone_contact', 'email_contact', 'social_net'] })
    const color = await db.delete('roly_color', { id: { _eq: '88888888' } }, 'affected_rows')
    return { data, color }
  }
  catch (error) {
    console.log(error)
  }
})
